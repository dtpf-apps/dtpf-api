const mongoose = require("mongoose");
const app = require("./app");
const { API_VERSION, IP_SERVER, PORT_DB, PORT_SERVER } = require("./config");
const http = require("http");
const socketIo = require("socket.io");
const { getMessagesLength } = require("./webSockets");
const server = http.createServer(app);
const io = socketIo(server);
let interval;
io.on("connection", (socket) => {
  console.log(`${socket.conn.server.clientsCount} usuario/s conectados`);
  getMessagesLength(socket);
  interval = setInterval(() => getMessagesLength(socket), 1000);
  socket.on("disconnect", () => {
    clearInterval(interval);
  });
});
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.connect(
  `mongodb://${IP_SERVER}:${PORT_DB}/davidthomaspizarrofrick`,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, res) => {
    if (err) {
      throw err;
    } else {
      console.log("La conexión a la base de datos es correcta");
      server.listen(PORT_SERVER, () => {
        console.log(`http://${IP_SERVER}:${PORT_SERVER}/api/${API_VERSION}`);
      });
    }
  }
);
