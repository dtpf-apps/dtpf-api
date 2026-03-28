import { Request, Response } from 'express';
import logger from '../services/logger';
import { getClientIp, createRateLimiter, isRateLimited } from '../utils/rateLimit';

const VALID_SOURCES = ['error-boundary', 'unhandled-error', 'unhandled-rejection', 'fetch-error'] as const;
type ErrorSource = (typeof VALID_SOURCES)[number];

const rateLimiter = createRateLimiter(10, 60 * 1000); // 10 per minute

function truncate(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

export function reportClientError(req: Request, res: Response) {
  const { message, stack, source, url, userAgent, timestamp } = req.body;

  // Validation
  if (!message || typeof message !== 'string') {
    return res
      .status(400)
      .send({ status: 400, message: 'El campo message es obligatorio y debe ser un string.' });
  }

  if (!source || !VALID_SOURCES.includes(source as ErrorSource)) {
    return res.status(400).send({
      status: 400,
      message: `source must be one of: ${VALID_SOURCES.join(', ')}.`,
    });
  }

  // IP rate limit
  const clientIp = getClientIp(req);
  if (isRateLimited(rateLimiter, clientIp)) {
    return res
      .status(429)
      .send({ status: 429, message: 'Demasiados reportes de error. Intentalo mas tarde.' });
  }

  logger.error(
    {
      clientError: {
        message: truncate(message, 500),
        stack: truncate(stack, 2000),
        source,
        url: truncate(url, 500),
        userAgent: truncate(userAgent, 200),
        timestamp,
      },
    },
    'client error'
  );

  return res.status(204).send();
}

// Exported for testing
export { rateLimiter };
