const mongoose = require('mongoose');
const app = require('./app');
const http = require('http');
const socketIo = require('socket.io');
const { getMessagesLength } = require('./webSockets');
const server = http.createServer(app);
const io = socketIo(server);
const config = require('../src/config/config');

let interval;
io.on('connection', (socket) => {
  console.log(`${socket.conn.server.clientsCount} usuario/s conectados`);
  getMessagesLength(socket);
  interval = setInterval(() => getMessagesLength(socket), 5000);
  socket.on('disconnect', () => {
    clearInterval(interval);
  });
});
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.connect(config.db.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true }, (err, res) => {
  if (err) {
    throw err;
  } else {
    console.log('La conexión a la base de datos es correcta');
    server.listen(config.app.PORT, () => {
      console.log(config.app.URL);
    });
  }
});
