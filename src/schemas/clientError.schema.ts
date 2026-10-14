import { z } from 'zod';

export const CLIENT_ERROR_SOURCES = ['error-boundary', 'unhandled-error', 'unhandled-rejection'] as const;

// Clipped rather than rejected: a report is diagnostics, and a long stack is still worth its head.
const clipped = (max: number) => z.string().transform((value) => value.slice(0, max));

export const clientErrorSchema = z.object({
  message: z.string().min(1).pipe(clipped(500)),
  source: z.enum(CLIENT_ERROR_SOURCES),
  stack: clipped(2000).optional(),
  url: clipped(500).optional(),
  userAgent: clipped(200).optional(),
  timestamp: z.number().optional(),
});
