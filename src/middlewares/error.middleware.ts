import { Request, Response, NextFunction } from 'express';
import logger from '../services/logger';

export function errorMiddleware(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error(err, 'Error interno del servidor');
  res.status(500).send({ message: 'Error interno del servidor' });
}
