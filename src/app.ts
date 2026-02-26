import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import config from './config/config';

import authRoutes from './routers/auth';
import userRoutes from './routers/user';
import menuRoutes from './routers/menu';
import contactRoutes from './routers/contact';
import educationRoutes from './routers/education';
import utilsRoutes from './routers/utils';
import aboutMeRoutes from './routers/aboutMe';
import { errorMiddleware } from './middlewares/error.middleware';

const app = express();

app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// CORS
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
  next();
});

// Router Basic
app.use(`/api/${config.app.API_VERSION}`, authRoutes);
app.use(`/api/${config.app.API_VERSION}`, userRoutes);
app.use(`/api/${config.app.API_VERSION}`, menuRoutes);
app.use(`/api/${config.app.API_VERSION}`, contactRoutes);
app.use(`/api/${config.app.API_VERSION}`, educationRoutes);
app.use(`/api/${config.app.API_VERSION}`, utilsRoutes);
app.use(`/api/${config.app.API_VERSION}`, aboutMeRoutes);

app.use(errorMiddleware);

if (process.env.NODE_ENV === 'production') {
  app.get('/client/service-worker.js', (_req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'client', 'service-worker.js'));
  });
  app.use('/', express.static('client', { redirect: false }));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.resolve('client/index.html'));
  });
}

export default app;
