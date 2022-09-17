const Contact = require("./models/contact");

const getMessagesLength = (socket) => {
  Contact.find({ readed: false }).then((messages) => {
    socket.emit("getMessagesLength", messages.length);
  });
};

module.exports = {
  getMessagesLength
};
