const Utils = require("../models/utils");

function connection(req, res) {
  return res.status(200).send({ status: 200 });
}

function createReloadMessages(req, res) {
  const util = new Utils();
  util.id = 1;
  util.reloadMessages = true;
  util.save((err, utilStored) => {
    if (err) {
      res.status(400).send({ status: 400, message: "El util ya existe." });
    } else {
      if (!utilStored) {
        res
          .status(404)
          .send({ status: 404, message: "Error al crear el útil." });
      } else {
        res.status(200).send({
          status: 200,
          message: "Útil creado correctamente.",
          utilStored: utilStored,
        });
      }
    }
  });
}

function createIndexedDBVersion(req, res) {
  const util = new Utils();
  util.id = 2;
  util.indexedDBVersion = 1;
  util.save((err, utilStored) => {
    if (err) {
      res.status(400).send({ status: 400, message: "El util ya existe." });
    } else {
      if (!utilStored) {
        res
          .status(404)
          .send({ status: 404, message: "Error al crear el útil." });
      } else {
        res.status(200).send({
          status: 200,
          message: "Útil creado correctamente.",
          utilStored: utilStored,
        });
      }
    }
  });
}

function getIndexedDBVersion(req, res) {
  Utils.findOne({ id: 2 }).exec((err, idbVersion) => {
    if (err) {
      res.status(500).send({ status: 500, message: "Error del servidor." });
    } else {
      if (!idbVersion) {
        res.status(404).send({
          status: 404,
          message: "Error al enviar los parámetros.",
        });
      } else {
        res.status(200).send({ indexedDBVersion: idbVersion.indexedDBVersion });
      }
    }
  });
}

function updateIndexedDBVersion(req, res) {
  Utils.findOne({ id: 2 }).exec((err, idbVersion) => {
    if (err) {
      res.status(500).send({ status: 500, message: "Error del servidor." });
    } else {
      if (!idbVersion) {
        res.status(404).send({
          status: 404,
          message: "Error al enviar los parámetros.",
        });
      } else {
        const version = idbVersion.indexedDBVersion;
        Utils.findOneAndUpdate(
          { id: 2 },
          { indexedDBVersion: version + 1 },
          (err, versionStored) => {
            if (err) {
              res
                .status(500)
                .send({ status: 500, message: "Error del servidor." });
            } else {
              if (!versionStored) {
                res
                  .status(404)
                  .send({ status: 404, message: "No hay parámetros." });
              } else {
                res.status(200).send({
                  status: 200,
                  message: "IndexedDB actualizada correctamente.",
                  indexedDBVersion: version + 1,
                });
              }
            }
          }
        );
      }
    }
  });
}

function messagesStatus(req, res) {
  Utils.findOne({ id: 1 }).exec((err, statusStored) => {
    if (err) {
      res.status(500).send({ status: 500, message: "Error del servidor." });
    } else {
      if (!statusStored) {
        res.status(404).send({
          status: 404,
          message: "Error al enviar los parámetros.",
        });
      } else {
        res.status(200).send({ messagesStatus: statusStored.reloadMessages });
      }
    }
  });
}

function reloadMessages(req, res) {
  const { haveToReload } = req.params;
  console.log(haveToReload);
  let message;
  if (haveToReload === "true") {
    message = "Mensaje enviado."
  } else if (haveToReload === "false") {
    message = "Mensaje leído."
  }
  Utils.findOneAndUpdate(
    { id: 1 },
    { reloadMessages: haveToReload },
    (err, reload) => {
      if (err) {
        res.status(500).send({ status: 500, message: "Error del servidor." });
      } else {
        if (!reload) {
          res.status(404).send({ status: 404, message: "No hay parámetro." });
        } else {
          res
            .status(200)
            .send({
              status: 200,
              message: message,
            });
        }
      }
    }
  );
}

module.exports = {
  createReloadMessages,
  createIndexedDBVersion,
  getIndexedDBVersion,
  updateIndexedDBVersion,
  connection,
  reloadMessages,
  messagesStatus,
};
