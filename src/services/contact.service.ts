import Contact from '../models/contact';
import config from '../config/config';
import type { ContactInput } from '../schemas/contact.schema';
import { sendEmail } from './email';
import { contactNotificationHtml } from './emailTemplates';

export const EMAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const notificationDate = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'Europe/Madrid',
});

// The API runs as one process per environment, so this set is enough to make the
// cooldown check and the insert one step per address: two submits sent at the
// same moment can no longer both find "no recent message" and both be stored.
const inFlight = new Set<string>();

export type SubmitResult = { ok: true } | { ok: false; retryAfterMs: number };

/** Stores a validated message unless the address wrote within the cooldown, then notifies the owner. */
export async function submitContact(input: ContactInput, now = Date.now()): Promise<SubmitResult> {
  if (inFlight.has(input.email)) return { ok: false, retryAfterMs: EMAIL_COOLDOWN_MS };

  inFlight.add(input.email);
  try {
    const last = await Contact.findOne({ email: input.email }).sort({ date: -1 }).select('date').lean();
    if (last) {
      const elapsed = now - last.date.getTime();
      if (elapsed < EMAIL_COOLDOWN_MS) return { ok: false, retryAfterMs: EMAIL_COOLDOWN_MS - elapsed };
    }
    await Contact.create({ ...input, date: new Date(now) });
  } finally {
    inFlight.delete(input.email);
  }

  notifyOwner(input, now);
  return { ok: true };
}

function sanitizeForHeader(value: string): string {
  return value
    .replace(/[\r\n\t]/g, ' ')
    .trim()
    .slice(0, 100);
}

function notifyOwner(input: ContactInput, now: number): void {
  if (!config.email.enabled) return;

  // Not awaited: the message is already stored, and the visitor should not wait on
  // SMTP. sendEmail retries and logs its own failures, and never rejects.
  void sendEmail({
    from: `"dtpf.es" <${config.email.from}>`,
    to: config.email.notificationTo,
    replyTo: input.email,
    subject: `Nuevo mensaje de ${sanitizeForHeader(input.name || input.email)} — dtpf.es`,
    html: contactNotificationHtml({
      name: input.name,
      email: input.email,
      message: input.message,
      date: notificationDate.format(now),
    }),
  });
}
