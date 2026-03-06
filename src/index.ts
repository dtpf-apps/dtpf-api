import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import config from './config/config';
import logger from './services/logger';
import { getMessagesLength } from './webSockets';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  logger.info(`${io.engine.clientsCount} usuario/s conectados`);
  getMessagesLength(socket);
  const interval = setInterval(() => getMessagesLength(socket), 5000);
  socket.on('disconnect', () => {
    clearInterval(interval);
  });
});

async function start() {
  try {
    await mongoose.connect(config.db.MONGO_URL);
    logger.info('La conexión a la base de datos es correcta');
    server.listen(config.app.PORT, () => {
      logger.info(config.app.URL);
    });
  } catch (err) {
    logger.error(err, 'Error al conectar con la base de datos');
    process.exit(1);
  }
}

start();
