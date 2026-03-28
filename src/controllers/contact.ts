import { Request, Response } from 'express';
import Contact from '../models/contact';
import config from '../config/config';
import { sendEmail } from '../services/email';
import { contactNotificationHtml } from '../services/emailTemplates';
import logger from '../services/logger';
import { getClientIp, createRateLimiter, isRateLimited } from '../utils/rateLimit';

const rateLimiter = createRateLimiter(3, 60 * 60 * 1000); // 3 per hour
const EMAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const MIN_SUBMIT_TIME_MS = 3000; // 3 seconds minimum to fill form
const MAX_URLS_IN_MESSAGE = 5;
const MIN_MESSAGE_LENGTH = 10;
const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 5000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function countUrls(text: string): number {
  const urlPattern = /https?:\/\/|www\./gi;
  return (text.match(urlPattern) || []).length;
}

function sanitizeForHeader(str: string): string {
  return str
    .replace(/[\r\n\t]/g, ' ')
    .trim()
    .slice(0, 100);
}

export async function contactMe(req: Request, res: Response) {
  try {
    const { email, name, message, website, _t } = req.body;

    // Honeypot: if "website" field is filled, it's a bot
    if (website) {
      // Fake success to not alert the bot
      return res.status(200).send({ status: 200, message: 'Mensaje enviado correctamente.' });
    }

    // Email validation
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).send({ status: 400, message: 'El email no es valido.' });
    }

    // Message validation
    if (!message || typeof message !== 'string') {
      return res.status(400).send({ status: 400, message: 'El mensaje es obligatorio.' });
    }

    if (message.trim().length < MIN_MESSAGE_LENGTH) {
      return res.status(400).send({
        status: 400,
        message: `El mensaje debe tener al menos ${MIN_MESSAGE_LENGTH} caracteres.`,
      });
    }

    if (message.trim().length > MAX_MESSAGE_LENGTH) {
      return res.status(400).send({
        status: 400,
        message: `El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.`,
      });
    }

    // Name sanitization
    const safeName = typeof name === 'string' ? name.trim().slice(0, MAX_NAME_LENGTH) : '';

    // Time trap: reject if form submitted too fast (mandatory — no _t means bot)
    if (!_t || typeof _t !== 'number' || Date.now() - _t < MIN_SUBMIT_TIME_MS) {
      return res.status(200).send({ status: 200, message: 'Mensaje enviado correctamente.' });
    }

    // URL spam check
    if (countUrls(message) > MAX_URLS_IN_MESSAGE) {
      return res.status(400).send({ status: 400, message: 'Demasiados enlaces en el mensaje.' });
    }

    // IP rate limit
    const clientIp = getClientIp(req);
    if (isRateLimited(rateLimiter, clientIp)) {
      logger.warn({ ip: clientIp }, 'Rate limit excedido');
      return res.status(429).send({
        status: 429,
        message: 'Demasiadas solicitudes. Intentalo mas tarde.',
      });
    }

    // Email cooldown (24h per email address)
    const now = Date.now();
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
      name: safeName,
      message: message.trim(),
    });
    await contact.save();

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
        subject: `Nuevo mensaje de ${sanitizeForHeader(safeName || email)} — dtpf.es`,
        html: contactNotificationHtml({
          name: safeName || 'Sin nombre',
          email: email.toLowerCase(),
          message: message.trim(),
          date: dateStr,
        }),
      }).catch((err) => {
        logger.error({ err }, 'Failed to send contact notification email');
      });
    }

    return res.status(201).send({ status: 201, message: 'Mensaje enviado correctamente.' });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}
