import { Request, Response } from 'express';
import Contact from '../models/contact';
import config from '../config/config';
import { sendEmail } from '../services/email';
import { contactNotificationHtml } from '../services/emailTemplates';
import logger from '../services/logger';

// In-memory rate limit by IP (reset on server restart — good enough for a portfolio)
const ipRequests = new Map<string, number[]>();
const IP_MAX_REQUESTS = 3;
const IP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const MIN_SUBMIT_TIME_MS = 3000; // 3 seconds minimum to fill form
const MAX_URLS_IN_MESSAGE = 5;
const MIN_MESSAGE_LENGTH = 10;

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

function countUrls(text: string): number {
  const urlPattern = /https?:\/\/|www\./gi;
  return (text.match(urlPattern) || []).length;
}

function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

export async function contactMe(req: Request, res: Response) {
  try {
    const { email, name, message, website, _t } = req.body;

    // Honeypot: if "website" field is filled, it's a bot
    if (website) {
      // Fake success to not alert the bot
      return res.status(200).send({ status: 200, message: 'Mensaje enviado correctamente.' });
    }

    // Validation
    if (!email || !message) {
      return res.status(400).send({ status: 400, message: 'El email y el mensaje son obligatorios.' });
    }

    if (typeof message !== 'string' || message.trim().length < MIN_MESSAGE_LENGTH) {
      return res.status(400).send({ status: 400, message: `El mensaje debe tener al menos ${MIN_MESSAGE_LENGTH} caracteres.` });
    }

    // Time trap: reject if form submitted too fast
    if (_t && typeof _t === 'number') {
      const elapsed = Date.now() - _t;
      if (elapsed < MIN_SUBMIT_TIME_MS) {
        // Fake success
        return res.status(200).send({ status: 200, message: 'Mensaje enviado correctamente.' });
      }
    }

    // URL spam check
    if (countUrls(message) > MAX_URLS_IN_MESSAGE) {
      return res.status(400).send({ status: 400, message: 'Demasiados enlaces en el mensaje.' });
    }

    // IP rate limit
    const clientIp = getClientIp(req);
    cleanExpiredEntries();
    const ipTimestamps = ipRequests.get(clientIp) || [];
    const now = Date.now();
    const recentRequests = ipTimestamps.filter((t) => now - t < IP_WINDOW_MS);
    if (recentRequests.length >= IP_MAX_REQUESTS) {
      return res.status(429).send({
        status: 429,
        message: 'Has enviado demasiados mensajes. Intentalo de nuevo mas tarde.',
      });
    }

    // Email cooldown (24h per email address)
    const lastContact = await Contact.findOne({ email: email.toLowerCase() }).sort({ date: -1 });
    if (lastContact) {
      const timeSinceLast = now - new Date(lastContact.date).getTime();
      if (timeSinceLast < EMAIL_COOLDOWN_MS) {
        const hoursLeft = Math.ceil((EMAIL_COOLDOWN_MS - timeSinceLast) / (60 * 60 * 1000));
        return res.status(429).send({
          status: 429,
          message: `Ya has enviado un mensaje recientemente. Puedes enviar otro en ${hoursLeft}h.`,
        });
      }
    }

    // Save to MongoDB
    const contact = new Contact({
      email: email.toLowerCase(),
      name: name || '',
      message: message.trim(),
    });
    const contactStored = await contact.save();
    if (!contactStored) {
      return res.status(500).send({ status: 500, message: 'Error al guardar el mensaje.' });
    }

    // Record IP request
    recentRequests.push(now);
    ipRequests.set(clientIp, recentRequests);

    // Send notification email (non-blocking)
    if (config.email.SMTP_USER) {
      const dateStr = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      sendEmail({
        from: `"dtpf.es" <${config.email.EMAIL_FROM}>`,
        to: config.email.NOTIFICATION_TO,
        replyTo: email.toLowerCase(),
        subject: `Nuevo mensaje de ${name || email} — dtpf.es`,
        html: contactNotificationHtml({
          name: name || 'Sin nombre',
          email: email.toLowerCase(),
          message: message.trim(),
          date: dateStr,
        }),
      }).catch((err) => {
        logger.error({ err }, 'Failed to send contact notification email');
      });
    }

    return res.status(200).send({ status: 200, message: 'Mensaje enviado correctamente.' });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}
