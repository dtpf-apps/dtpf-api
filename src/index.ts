import mongoose from 'mongoose';
import app from './app';
import config from './config/config';
import logger from './services/logger';
import { verifyEmailConnection } from './services/email';

async function start() {
  try {
    await mongoose.connect(config.db.MONGO_URL);
    logger.info('La conexion a la base de datos es correcta');

    if (config.email.SMTP_USER) {
      await verifyEmailConnection();
    }

    app.listen(config.app.PORT, () => {
      logger.info(config.app.URL);
    });
  } catch (err) {
    logger.error(err, 'Error al conectar con la base de datos');
    process.exit(1);
  }
}

start();
