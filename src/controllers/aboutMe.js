const AboutMe = require("../models/aboutMe");

function addMainInfo(req, res) {
  const { mainInfo } = req.body;
  const aboutMe = new AboutMe();
  aboutMe.id = 1;
  aboutMe.mainInfo = mainInfo;
  if (!aboutMe.mainInfo) {
    res.status(404).send({ status: 404, message: "La información principal es obligatoria." });
  } else {
    aboutMe.save((err, createdMainInfo) => {
      if (err) {
        res.status(500).send({ status: 500, message: "Error del servidor." });
      } else {
        if (!createdMainInfo) {
          res.status(404).send({ status: 404, message: "Error al crear la información principal." });
        } else {
          res.status(200).send({ status: 200, message: "Información principal creada correctamente." });
        }
      }
    });
  }
}

function getMainInfo(req, res) {
  AboutMe.findOne({ id: 1 }).exec((err, mainInfo) => {
    if (err) {
      res.status(500).send({ status: 500, message: "Error del servidor." });
    } else {
      if (!mainInfo) {
        res.status(404).send({
          status: 404,
          message: "Error al enviar los parámetros.",
        });
      } else {
        res.status(200).send({ status: 200, mainInfo: mainInfo.mainInfo });
      }
    }
  });
}

function updateMainInfo(req, res) {
  const { newMainInfo } = req.body;
  AboutMe.findOne({ id: 1 }).exec((err, oldMainInfo) => {
    if (err) {
      res.status(500).send({ status: 500, message: "Error del servidor." });
    } else {
      if (!oldMainInfo) {
        res.status(404).send({
          status: 404,
          message: "No existe la información principal en la base de datos.",
        });
      } else if (!newMainInfo) {
        res.status(404).send({
          status: 404,
          message: "No hay información principal.",
        });
      } else {
        AboutMe.findOneAndUpdate(
          { id: 1 },
          { mainInfo: newMainInfo },
          (err, updatedMainInfo) => {
            if (err) {
              res
                .status(500)
                .send({ status: 500, message: "Error del servidor." });
            } else {
              if (!updatedMainInfo) {
                res
                  .status(404)
                  .send({ status: 404, message: "No se ha podido actualizar." });
              } else {
                res.status(200).send({
                  status: 200,
                  message: "Información principal actualizada correctamente.",
                  mainInfo: newMainInfo
                });
              }
            }
          }
        );
      }
    }
  });
}

module.exports = {
  addMainInfo,
  getMainInfo,
  updateMainInfo
};
