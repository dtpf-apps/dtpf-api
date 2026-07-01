import express, { Request, Response, NextFunction } from 'express';
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

app.use(errorMiddleware);

if (process.env.NODE_ENV !== 'development') {
  app.use('/assets', express.static('client/assets', { maxAge: '1y', immutable: true, redirect: false }));
  app.use('/service-worker.js', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('CDN-Cache-Control', 'no-store');
    // Return a clean 404 (which tells a stale browser to unregister) if the
    // build ships no service worker, instead of throwing ENOENT into a 500.
    res.sendFile(path.resolve('client/service-worker.js'), (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  });
  app.use(
    '/',
    express.static('client', {
      redirect: false,
      setHeaders: (res) => {
        res.setHeader('CDN-Cache-Control', 'no-store');
      },
    })
  );
  app.get('/{*splat}', (_req: Request, res: Response) => {
    res.sendFile(path.resolve('client/index.html'));
  });
}

export default app;
