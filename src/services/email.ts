import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import config from '../config/config';
import logger from './logger';

export const transporter = nodemailer.createTransport({
  host: config.email.SMTP_HOST,
  port: config.email.SMTP_PORT,
  secure: false,
  pool: true,
  maxConnections: 2,
  auth: {
    user: config.email.SMTP_USER,
    pass: config.email.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendEmail(mailOptions: Mail.Options): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      logger.info({ messageId: info.messageId, to: mailOptions.to, attempt }, 'Email sent');
      return true;
    } catch (error) {
      logger.error({ err: error, to: mailOptions.to, attempt }, 'Email send failed');
      if (attempt < MAX_RETRIES) {
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
  } catch (error) {
    logger.warn({ err: error }, 'Email transporter verification failed — emails may not work');
    return false;
  }
}
