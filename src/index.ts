import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import config from './config/config';
import { getMessagesLength } from './webSockets';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log(`${io.engine.clientsCount} usuario/s conectados`);
  getMessagesLength(socket);
  const interval = setInterval(() => getMessagesLength(socket), 5000);
  socket.on('disconnect', () => {
    clearInterval(interval);
  });
});

async function start() {
  try {
    await mongoose.connect(config.db.MONGO_URL);
    console.log('La conexión a la base de datos es correcta');
    server.listen(config.app.PORT, () => {
      console.log(config.app.URL);
    });
  } catch (err) {
    console.error('Error al conectar con la base de datos:', err);
    process.exit(1);
  }
}

start();
