import { Request, Response, NextFunction } from 'express';
import logger from '../services/logger';

export function errorMiddleware(
  err: Error & { type?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).send({ status: 400, message: 'JSON invalido.' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).send({ status: 400, message: 'Datos de entrada invalidos.' });
  }
  logger.error(err, 'Error interno del servidor');
  res.status(500).send({ status: 500, message: 'Error interno del servidor' });
}
