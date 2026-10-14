import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import config from '../config/config';
import logger from './logger';

const IMPLICIT_TLS_PORT = 465;

export const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === IMPLICIT_TLS_PORT,
  // On a submission port the session starts in clear and upgrades with STARTTLS.
  // Requiring it means the credentials are never sent if the upgrade is not offered.
  requireTLS: config.email.port !== IMPLICIT_TLS_PORT,
  pool: true,
  maxConnections: 2,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 30_000,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
  // Certificate verification stays on in every environment; the server name is
  // what lets it pass when SMTP_HOST is a LAN address rather than the hostname.
  tls: {
    servername: config.email.tlsServername,
  },
});

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Sends one message, retrying once. Never throws: the outcome is the return value and the log. */
export async function sendEmail(mailOptions: Mail.Options): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      logger.info({ messageId: info.messageId, to: mailOptions.to, attempt }, 'Email sent');
      return true;
    } catch (err) {
      logger.error({ err, to: mailOptions.to, attempt }, 'Email send failed');
      if (attempt < MAX_ATTEMPTS) {
        await delay(RETRY_DELAY_MS);
      }
    }
  }
  return false;
}

export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    logger.info('Email transporter verified');
    return true;
  } catch (err) {
    logger.warn({ err }, 'Email transporter verification failed: notifications may not be delivered');
    return false;
  }
}
