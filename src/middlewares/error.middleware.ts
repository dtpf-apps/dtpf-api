import { Request, Response, NextFunction } from 'express';
import logger from '../services/logger';

export function errorMiddleware(
  err: Error & { type?: string; status?: number; statusCode?: number },
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
  // Honour the HTTP status the error already carries. Express tags a scanner's
  // malformed-URL URIError with 400 and a missing static file with 404; those
  // are client-caused, not server faults — log them at `warn` (below the
  // level>=50 alert threshold) and return their real status. Only genuine 5xx
  // (or an error carrying no client status) are logged at `error`.
  const rawStatus =
    typeof err.status === 'number'
      ? err.status
      : typeof err.statusCode === 'number'
        ? err.statusCode
        : undefined;
  const status = rawStatus !== undefined && rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;

  if (status < 500) {
    logger.warn(err, 'Peticion de cliente invalida');
    return res.status(status).send({ status, message: 'Peticion invalida.' });
  }

  logger.error(err, 'Error interno del servidor');
  res.status(status).send({ status, message: 'Error interno del servidor' });
}
