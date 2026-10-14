import { z } from 'zod';
import { isErrorCode, type ErrorCode } from '../utils/apiError';

// Shared with the Mongoose model, so the boundary and the storage can never disagree.
export const CONTACT_LIMITS = {
  emailMax: 254,
  nameMax: 100,
  messageMin: 10,
  messageMax: 5000,
} as const;

// Each check carries its error code as its message; `firstErrorCode` reads it back.
// The honeypot and the time trap are not part of the payload's shape: the controller
// reads them before and after validation, and answers a bot as if it had succeeded.
export const contactSchema = z.object({
  email: z
    .string({ error: 'invalid_email' })
    .trim()
    .toLowerCase()
    .max(CONTACT_LIMITS.emailMax, { error: 'invalid_email' })
    .regex(z.regexes.email, { error: 'invalid_email' }),
  message: z
    .string({ error: 'message_required' })
    .trim()
    .min(1, { error: 'message_required' })
    .min(CONTACT_LIMITS.messageMin, { error: 'message_too_short' })
    .max(CONTACT_LIMITS.messageMax, { error: 'message_too_long' }),
  name: z
    .string({ error: 'invalid_name' })
    .trim()
    .max(CONTACT_LIMITS.nameMax, { error: 'name_too_long' })
    .nullish()
    .transform((name) => name ?? ''),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** The code of the first problem, in field order. A body that is not an object at all is `invalid_body`. */
export function firstErrorCode(error: z.ZodError): ErrorCode {
  const message = error.issues[0]?.message ?? '';
  return isErrorCode(message) ? message : 'invalid_body';
}
