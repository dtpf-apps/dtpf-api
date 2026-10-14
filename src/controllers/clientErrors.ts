import type { Request, Response } from 'express';
import { clientErrorSchema } from '../schemas/clientError.schema';
import logger from '../services/logger';
import { sendError } from '../utils/apiError';
import { consume, createRateLimiter } from '../utils/rateLimit';

const ipLimiter = createRateLimiter(10, 60 * 1000);

export function reportClientError(req: Request, res: Response) {
  // Limited before validation: a flood of malformed reports is still a flood.
  const limitedForMs = consume(ipLimiter, req.ip ?? 'unknown');
  if (limitedForMs > 0) return sendError(res, 429, 'rate_limited', { retryAfterMs: limitedForMs });

  const parsed = clientErrorSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'invalid_client_error');

  logger.error({ clientError: parsed.data }, 'client error');
  return res.status(204).end();
}
