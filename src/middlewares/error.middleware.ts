import type { Request, Response, NextFunction } from 'express';
import logger from '../services/logger';
import { sendError } from '../utils/apiError';

type HttpError = Error & { type?: string; status?: number; statusCode?: number };

function httpStatus(err: HttpError): number {
  const status = err.status ?? err.statusCode;
  return typeof status === 'number' && status >= 400 && status <= 599 ? status : 500;
}

export function errorMiddleware(err: HttpError, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err);

  // The body parser tags its own failures. Matching on the tag, not on SyntaxError,
  // keeps a SyntaxError thrown by our own code a server fault instead of "bad input".
  if (err.type === 'entity.parse.failed') return sendError(res, 400, 'invalid_json');
  if (err.type === 'entity.too.large') return sendError(res, 413, 'payload_too_large');

  // Honour the status the error already carries: Express tags a scanner's
  // malformed-URL URIError with 400 and a missing static file with 404. Those are
  // the client's doing, so they log at `warn`, below the alerting threshold.
  const status = httpStatus(err);
  if (status < 500) {
    logger.warn({ err }, 'Client request rejected');
    return sendError(res, status, status === 404 ? 'not_found' : 'bad_request');
  }

  logger.error({ err }, 'Unhandled server error');
  return sendError(res, status, 'server_error');
}
