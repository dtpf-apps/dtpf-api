const AboutMe = require("../models/aboutMe");

function addAboutMeInfo(req, res) {
  const body = req.body;
  const aboutMe = new AboutMe();
  aboutMe.title = body.title;
  aboutMe.content1 = body.content1;
  aboutMe.content2 = body.content2;
  aboutMe.content3 = body.content3;
  aboutMe.content4 = body.content4;
  aboutMe.content5 = body.content5;
  aboutMe.content6 = body.content6;
  if (!aboutMe.title || !aboutMe.content1) {
    res.status(404).send({ status: 404, message: "La información principal es obligatoria." });
  } else {
    aboutMe.save((err, createdMainInfo) => {
      if (err) {
        if (err.code === 11000) {
          res.status(500).send({ status: 500, message: "El título ya existe." });
        } else {
          res.status(500).send({ status: 500, message: "Error del servidor." });
        }
      } else {
        if (!createdMainInfo) {
          res
            .status(404)
            .send({ status: 404, message: "Error al crear la información principal." });
        } else {
          res.status(200).send({ status: 200, message: "Información creada correctamente." });
        }
      }
    });
  }
}

function getAboutMeInfo(req, res) {
  let params = req.params;
  AboutMe.findOne({ title: params.title }).exec((err, info) => {
    if (err) {
      res.status(500).send({ status: 500, message: "Error del servidor." });
    } else {
      if (!info) {
        res.status(404).send({
          status: 404,
          message: "Error al enviar los parámetros.",
        });
      } else {
        res.status(200).send({ status: 200, info: info });
      }
    }
  });
}

function updateAboutMeInfo(req, res) {
  let params = req.params;
  const body = req.body;
  AboutMe.findOneAndUpdate(
    { title: params.title },
    {
      content1: body.content1,
      content2: body.content2,
      content3: body.content3,
      content4: body.content4,
      content5: body.content5,
      content6: body.content6,
    },
    (err, updatedMainInfo) => {
      if (err) {
        res.status(500).send({ status: 500, message: "Error del servidor." });
      } else {
        if (!updatedMainInfo) {
          res.status(404).send({ status: 404, message: "No se ha podido actualizar." });
        } else if (!body.content1) {
          res.status(404).send({
            status: 404,
            message: "El contenido no puede estar vacío.",
          });
        } else {
          res.status(200).send({
            status: 200,
            message: "Información principal actualizada correctamente.",
          });
        }
      }
    }
  );
}

module.exports = {
  addAboutMeInfo,
  getAboutMeInfo,
  updateAboutMeInfo,
};
