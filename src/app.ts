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

const app = express();

app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false, limit: '16kb' }));
app.use(express.json({ limit: '16kb' }));
app.use(compression());
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => (req as express.Request).path === '/api/v1/connection',
    },
    serializers: {
      req(req) {
        return { method: req.method, url: req.url, id: req.id };
      },
    },
  })
);

// CORS
const allowedOrigins = ['http://localhost:3000', 'https://dtpf.es', 'https://dev.dtpf.es'];

app.use((_req: Request, res: Response, next: NextFunction) => {
  const origin = _req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Headers', 'Authorization, Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(securityHeadersMiddleware);

// Routes
app.use(`/api/${config.app.API_VERSION}`, clientErrorsRoutes);
app.use(`/api/${config.app.API_VERSION}`, contactRoutes);
app.use(`/api/${config.app.API_VERSION}`, utilsRoutes);

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

if (process.env.NODE_ENV !== 'development') {
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
      setHeaders: (res) => {
        res.setHeader('CDN-Cache-Control', 'no-store');
      },
    })
  );
  app.get('/{*splat}', (req: Request, res: Response, next: NextFunction) => {
    // An unknown API path is an API error, never the SPA shell with a 200.
    if (req.path.startsWith('/api/')) {
      return next(Object.assign(new Error(`No route for ${req.path}`), { status: 404 }));
    }
    const page = prerenderedPage(req.path);
    res
      .status(page || !clientIsPrerendered() ? 200 : 404)
      .sendFile(page ?? 'index.html', { root: clientDir });
  });
}

// Error handler LAST, so it also catches errors thrown by the production static
// and SPA-catch-all handlers above — e.g. a scanner's malformed-URL URIError
// from the `{*splat}` param decode, which otherwise falls through to Express's
// default finalhandler (a 500, or a stack-trace leak when NODE_ENV != production).
app.use(errorMiddleware);

export default app;
