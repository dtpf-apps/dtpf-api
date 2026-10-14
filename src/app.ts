import express, { Request, Response, NextFunction } from 'express';
import { existsSync } from 'fs';
import path from 'path';
import compression from 'compression';
import pinoHttp from 'pino-http';
import config from './config/config';
import logger from './services/logger';

import clientErrorsRoutes from './routers/clientErrors';
import contactRoutes from './routers/contact';
import utilsRoutes from './routers/utils';
import { errorMiddleware } from './middlewares/error.middleware';
import { securityHeadersMiddleware } from './middlewares/securityHeaders.middleware';
import { canonicalHostMiddleware } from './middlewares/canonicalHost.middleware';
import { sendError } from './utils/apiError';

const app = express();
const apiPrefix = `/api/${config.app.apiVersion}`;

app.disable('x-powered-by');
// Visitor → Cloudflare → reverse proxy → this process. The proxy resolves the
// Cloudflare hop itself (it trusts CF-Connecting-IP from Cloudflare's ranges only)
// and appends that address to X-Forwarded-For, so it is the one hop to trust:
// `req.ip` is the last entry it wrote. Everything to its left came from the caller.
app.set('trust proxy', 1);
app.use(express.json({ limit: '16kb' }));
app.use(compression());
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => (req as express.Request).path === `${apiPrefix}/connection`,
    },
    serializers: {
      req(req) {
        return { method: req.method, url: req.url, id: req.id };
      },
    },
  })
);

// Before the security headers: a www request gets its 301 and nothing else.
app.use(canonicalHostMiddleware);

// No CORS on purpose. Every deployed environment serves the client from this same
// origin, and local development reaches the API through the Vite dev-server proxy,
// so no browser ever has a cross-origin reason to call it.
app.use(securityHeadersMiddleware);

app.use(apiPrefix, clientErrorsRoutes);
app.use(apiPrefix, contactRoutes);
app.use(apiPrefix, utilsRoutes);

// The built SPA is deployed beside the server as `client/`; tests point this at a fixture.
const clientDir = path.resolve(process.env.CLIENT_DIR ?? 'client');

// The frontend build writes one `index.html` per route under `client/<route>/`,
// whose <head> carries that page's own title, description, Open Graph and
// canonical tags. Link previews and crawlers fetch the route URL as-is, so they
// must receive that file rather than the shell. `express.static` only finds it
// for URLs ending in `/` (with `redirect: false` it skips a bare directory), so
// the catch-all resolves it for the rest. Returns the file relative to `client/`
// (served with `root`, so `send` confines it there too) or null when the build
// produced none; normalising first collapses `..` segments so a crafted URL can
// only ever name a file under `client/`.
function prerenderedPage(urlPath: string): string | null {
  const relative = path.posix.join('.', path.posix.normalize(urlPath), 'index.html');
  if (relative.startsWith('..')) return null;
  return existsSync(path.join(clientDir, relative)) ? relative : null;
}

// A build that pre-renders emits a file for EVERY page (the English home is the
// cheapest proof), so under such a build a path without one is unknown. The
// shell still lets the client render its not-found page, but a 404 status keeps
// a mistyped URL out of the index instead of indexing it as a copy of the home,
// whose head the shell carries. Checked per request: the client is rsynced
// without restarting this process, and an older build must keep the plain 200.
function clientIsPrerendered(): boolean {
  return existsSync(path.join(clientDir, 'en', 'index.html'));
}

// Cloudflare rewrites HTML at the edge: it injects its Web Analytics beacon into every
// page it proxies, and the CSP then blocks that script — one console error per page and
// no analytics either way. `no-transform` is how an origin declines edge rewriting, and
// Cloudflare documents that it does not inject into such a response, so the pages leave
// here byte-exact. `public, max-age=0` is what `send` would have set on its own.
const HTML_CACHE_CONTROL = 'public, max-age=0, no-transform';

function htmlResponseHeaders(res: Response): void {
  res.setHeader('Cache-Control', HTML_CACHE_CONTROL);
  res.setHeader('CDN-Cache-Control', 'no-store');
}

// In development the client runs on the Vite dev server; everywhere else it is served from here.
if (config.env !== 'development') {
  app.use(
    '/assets',
    express.static(path.join(clientDir, 'assets'), { maxAge: '1y', immutable: true, redirect: false })
  );
  app.use('/service-worker.js', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('CDN-Cache-Control', 'no-store');
    // Return a clean 404 (which tells a stale browser to unregister) if the
    // build ships no service worker, instead of throwing ENOENT into a 500.
    res.sendFile('service-worker.js', { root: clientDir }, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  });
  app.use(
    '/',
    express.static(clientDir, {
      redirect: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) htmlResponseHeaders(res);
        else res.setHeader('CDN-Cache-Control', 'no-store');
      },
    })
  );
  app.get('/{*splat}', (req: Request, res: Response, next: NextFunction) => {
    // An unknown API path is an API error, never the SPA shell with a 200.
    if (req.path.startsWith('/api/')) return next();
    const page = prerenderedPage(req.path);
    htmlResponseHeaders(res);
    res
      .status(page || !clientIsPrerendered() ? 200 : 404)
      .sendFile(page ?? 'index.html', { root: clientDir });
  });
}

// Anything no route claimed: in development that includes every non-API path.
app.use((_req: Request, res: Response) => sendError(res, 404, 'not_found'));

// Error handler LAST, so it also catches errors thrown by the production static
// and SPA-catch-all handlers above — e.g. a scanner's malformed-URL URIError
// from the `{*splat}` param decode, which otherwise falls through to Express's
// default finalhandler (a 500, or a stack-trace leak when NODE_ENV != production).
app.use(errorMiddleware);

export default app;
