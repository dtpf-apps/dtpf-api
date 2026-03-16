import { Request, Response } from 'express';
import logger from '../services/logger';

const VALID_SOURCES = ['error-boundary', 'unhandled-error', 'unhandled-rejection', 'fetch-error'] as const;
type ErrorSource = (typeof VALID_SOURCES)[number];

// In-memory rate limit by IP (10 req/min)
const ipRequests = new Map<string, number[]>();
const IP_MAX_REQUESTS = 10;
const IP_WINDOW_MS = 60 * 1000; // 1 minute

function truncate(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

function cleanExpiredEntries() {
  const now = Date.now();
  for (const [ip, timestamps] of ipRequests) {
    const valid = timestamps.filter((t) => now - t < IP_WINDOW_MS);
    if (valid.length === 0) {
      ipRequests.delete(ip);
    } else {
      ipRequests.set(ip, valid);
    }
  }
}

export function reportClientError(req: Request, res: Response) {
  const { message, stack, source, url, userAgent, timestamp } = req.body;

  // Validation
  if (!message || typeof message !== 'string') {
    return res.status(400).send({ status: 400, message: 'message is required and must be a string.' });
  }

  if (!source || !VALID_SOURCES.includes(source as ErrorSource)) {
    return res.status(400).send({
      status: 400,
      message: `source must be one of: ${VALID_SOURCES.join(', ')}.`,
    });
  }

  // IP rate limit
  const clientIp = getClientIp(req);
  cleanExpiredEntries();
  const ipTimestamps = ipRequests.get(clientIp) || [];
  const now = Date.now();
  const recentRequests = ipTimestamps.filter((t) => now - t < IP_WINDOW_MS);
  if (recentRequests.length >= IP_MAX_REQUESTS) {
    return res.status(429).send({ status: 429, message: 'Too many error reports. Try again later.' });
  }

  recentRequests.push(now);
  ipRequests.set(clientIp, recentRequests);

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
export { ipRequests };
