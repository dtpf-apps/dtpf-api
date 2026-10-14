import type { Request, Response } from 'express';
import { contactSchema, firstErrorCode } from '../schemas/contact.schema';
import { submitContact } from '../services/contact.service';
import logger from '../services/logger';
import { sendError } from '../utils/apiError';
import { consume, createRateLimiter } from '../utils/rateLimit';

const ipLimiter = createRateLimiter(3, 60 * 60 * 1000);
const MIN_FILL_TIME_MS = 3000;
const MAX_LINKS = 5;
const LINK_PATTERN = /https?:\/\/|www\./gi;

// A dropped bot gets exactly what a real sender gets, so it cannot tell it was caught.
function accepted(res: Response) {
  return res.status(201).send({ status: 201, message: 'Mensaje enviado correctamente.' });
}

function field(body: unknown, key: string): unknown {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[key] : undefined;
}

export async function contactMe(req: Request, res: Response) {
  const body: unknown = req.body;

  // Honeypot: `website` is hidden from people, so only a bot fills it.
  if (field(body, 'website')) return accepted(res);

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return sendError(res, 400, firstErrorCode(parsed.error));

  // Time trap: the form stamps when it was rendered. No stamp, or a submit faster
  // than a person can type, is a script.
  const renderedAt = field(body, '_t');
  if (typeof renderedAt !== 'number' || Date.now() - renderedAt < MIN_FILL_TIME_MS) return accepted(res);

  if ((parsed.data.message.match(LINK_PATTERN) ?? []).length > MAX_LINKS) {
    return sendError(res, 400, 'too_many_links');
  }

  const ip = req.ip ?? 'unknown';
  const limitedForMs = consume(ipLimiter, ip);
  if (limitedForMs > 0) {
    logger.warn({ ip }, 'Contact rate limit exceeded');
    return sendError(res, 429, 'rate_limited', { retryAfterMs: limitedForMs });
  }

  const result = await submitContact(parsed.data);
  if (!result.ok) return sendError(res, 429, 'email_cooldown', { retryAfterMs: result.retryAfterMs });

  return accepted(res);
}
