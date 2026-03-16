import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import pinoHttp from 'pino-http';
import config from './config/config';
import logger from './services/logger';

import clientErrorsRoutes from './routers/clientErrors';
import contactRoutes from './routers/contact';
import utilsRoutes from './routers/utils';
import { errorMiddleware } from './middlewares/error.middleware';

const app = express();

app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
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
  res.header('Allow', 'GET, POST, OPTIONS');
  next();
});

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
    res.sendFile(path.resolve('client/service-worker.js'));
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
