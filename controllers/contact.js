const Contact = require("../models/contact");

function contactMe(req, res) {
  const contact = new Contact();
  const { email, name, phone_number, subject, message } = req.body;
  contact.email = email.toLowerCase();
  contact.name = name;
  contact.phone_number = phone_number;
  contact.subject = subject;
  contact.message = message;
  contact.readed = false;
  contact.date = contact.date;
  if (!email && !message) {
    res.status(404).send({
      status: 404,
      message: "El email y el mensaje son obligatorios.",
    });
  } else if (!email) {
    res.status(404).send({
      status: 404,
      message: "El email es obligatorio.",
    });
  } else if (!message) {
    res.status(404).send({
      status: 404,
      message: "El mensaje es obligatorio.",
    });
  } else {
    Contact.find({ email: contact.email }, (err, getContact) => {
      let contactsReverse = getContact.reverse();
      let getLastContact = contactsReverse[0];
      if (err) {
        return res.status(500).send({
          status: 500,
          message: "Error al hacer la consulta con la base de datos.",
        });
      } else if (!getLastContact) {
        contact.save((err, contactStored) => {
          if (err) {
            return res
              .status(500)
              .send({ status: 500, message: "Error del servidor." });
          } else if (!contactStored) {
            return res
              .status(404)
              .send({ status: 404, message: "Error al enviar la petición." });
          } else {
            return res
              .status(200)
              .send({ status: 200, contact: contactStored });
          }
        });
      } else if (getLastContact.readed === false) {
        return res.status(404).send({
          status: 404,
          message:
            "Hasta que no lea el último mensaje que has enviado no puedes enviar más.",
        });
      } else {
        contact.save((err, contactStored) => {
          if (err) {
            return res
              .status(500)
              .send({ status: 500, message: "Error del servidor." });
          } else if (!contactStored) {
            return res
              .status(404)
              .send({ status: 404, message: "Error al enviar la petición." });
          } else {
            return res
              .status(200)
              .send({ status: 200, contact: contactStored });
          }
        });
      }
    });
  }
}

function getMessagesUnread(req, res) {
  const query = req.query;
  Contact.find({ readed: query.readed })
        .sort({ date: "desc"})
        .exec((err, messagesStored) => {
          if(err) {
            res.status(500).send({ status: 500, message: "Error del servidor." });
          } else if (!messagesStored) {
            res.status(404).send({ status: 404, message: "No hay mensajes en la base de datos." });
          } else {
            res.status(200).send({ status: 200, messages: messagesStored });
          }
        });
}

function checkMessage(req, res) {
  const { id } = req.params;
  const { readed } = req.body;  
  Contact.findByIdAndUpdate(id, {readed}, (err, messageChecked) => {
    if (err) {
      res.status(500).send({ status: 500, message: "Error del servidor."} );
    } else if (!messageChecked) {
      res.status(404).send({ status: 404, message: "No se ha encontrado el mensaje." });
    } else {
      if (readed === true) {
        res.status(200).send({ status: 200, message: "Mensaje marcado como leído." });
      } else {
        res.status(200).send({ status: 200, message: "Mensaje sacado de la bandeja de leídos." });
      }
    }
  });
}

function deleteMessage(req, res) {
  const { id } = req.params;
  Contact.findByIdAndRemove(id, (err, messageDelete) => {
    if(err) {
      res.status(500).send({ status: 500, message: "Error del servidor." });
    } else if (!messageDelete) {
      res.status(404).send({ status: 404, message: "Mensaje no encontrado en la base de datos." });
    } else {
      res.status(200).send({ status: 200, message: "Mensaje eliminado correctamente." })
    }
  });
}

function getLastMessageEmail(req, res) {
  Contact.find({ readed: false })
        .sort({ date: "desc"})
        .exec((err, messagesStored) => {
          if(err) {
            console.log(err);
            res.status(500).send({ status: 500, message: "Error del servidor." });
          } else if (!messagesStored) {
            res.status(404).send({ status: 404, message: "No hay mensajes en la base de datos." });
          } else {
            if (messagesStored.length === 0) {
              res.status(200).send({ status: 200, message: "Bandeja de entrada vacía."});
            } else {
              res.status(200).send({ status: 200, email: messagesStored[0].email });
            }
          }
        });
}
module.exports = {
  contactMe,
  getMessagesUnread,
  checkMessage,
  deleteMessage,
  getLastMessageEmail
};