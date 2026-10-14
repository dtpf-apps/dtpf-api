import type { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiError';

// Without a matching parser Express leaves `req.body` undefined, and the request
// would otherwise reach validation as an empty payload with a misleading answer.
export function requireJson(req: Request, res: Response, next: NextFunction) {
  if (!req.is('application/json')) return sendError(res, 415, 'unsupported_media_type');
  return next();
}
