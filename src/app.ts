import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import pinoHttp from 'pino-http';
import { dauthRouter } from 'dauth-md-node/router';
import config from './config/config';
import logger from './services/logger';

import contactRoutes from './routers/contact';
import utilsRoutes from './routers/utils';
import { errorMiddleware } from './middlewares/error.middleware';

const app = express();

app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(pinoHttp({ logger }));

// CORS
const allowedOrigins = [config.dauth.DOMAIN_URL, 'http://localhost:3000', 'https://dtpf.es', 'https://dev.dtpf.es'];

app.use((_req: Request, res: Response, next: NextFunction) => {
  const origin = _req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header(
    'Access-Control-Allow-Headers',
    'Authorization, X-API-KEY, X-CSRF-Token, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
  next();
});

// Auth proxy (BFF — dauthRouter handles exchange-code, session, logout, user)
app.use(
  '/api/auth',
  dauthRouter({
    domainName: config.dauth.DOMAIN_NAME,
    tsk: config.dauth.TSK,
    dauthUrl: config.dauth.DOMAIN_URL || undefined,
    previousTsk: config.dauth.PREVIOUS_TSK || undefined,
  })
);

// Routes
app.use(`/api/${config.app.API_VERSION}`, contactRoutes);
app.use(`/api/${config.app.API_VERSION}`, utilsRoutes);

app.use(errorMiddleware);

if (process.env.NODE_ENV !== 'development') {
  app.use(
    '/assets',
    express.static('client/assets', { maxAge: '1y', immutable: true, redirect: false })
  );
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
