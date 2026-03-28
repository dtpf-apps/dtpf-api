import mongoose from 'mongoose';
import app from './app';
import config from './config/config';
import logger from './services/logger';
import { transporter, verifyEmailConnection } from './services/email';

async function start() {
  try {
    await mongoose.connect(config.db.MONGO_URL, {
      maxPoolSize: 5,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('La conexion a la base de datos es correcta');

    if (config.email.SMTP_USER) {
      await verifyEmailConnection();
    }

    const server = app.listen(config.app.PORT, () => {
      logger.info(config.app.URL);
    });

    async function shutdown(signal: string) {
      logger.info(`${signal} received — shutting down`);
      server.close();
      transporter.close();
      await mongoose.connection.close();
      process.exit(0);
    }
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error(err, 'Error al conectar con la base de datos');
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled rejection');
});

process.on('uncaughtException', (err) => {
  logger.error(err, 'Uncaught exception — shutting down');
  process.exit(1);
});

start();
