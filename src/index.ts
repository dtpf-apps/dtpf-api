import mongoose from 'mongoose';
import app from './app';
import config from './config/config';
import logger from './services/logger';
import { transporter, verifyEmailConnection } from './services/email';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start() {
  await mongoose.connect(config.db.url, {
    maxPoolSize: 5,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
  });
  logger.info('Connected to MongoDB');

  if (config.email.enabled) {
    await verifyEmailConnection();
  }

  const server = app.listen(config.app.port, () => {
    logger.info({ port: config.app.port, env: config.env }, 'API listening');
  });

  let shuttingDown = false;
  async function shutdown(signal: NodeJS.Signals) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    // Stop accepting connections and let in-flight requests finish before the
    // database and the mail pool go away underneath them.
    await new Promise<void>((resolve) => server.close(() => resolve()));
    transporter.close();
    await mongoose.disconnect();
    process.exit(0);
  }
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

// Both mean the process is in a state nothing planned for: log it and let PM2 start a clean one.
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled rejection');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

start().catch((err: unknown) => {
  logger.fatal({ err }, 'Startup failed');
  process.exit(1);
});
