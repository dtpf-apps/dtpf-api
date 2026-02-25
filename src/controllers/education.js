const fs = require('fs');
const path = require('path');
const Education = require('../models/education');
// const { Geometry,Image } = require('image-m');

function addCourse(req, res) {
  const course = new Education();
  const { title, description, duration, date, url, platform } = req.body;
  course.title = title;
  course.description = description;
  course.duration = duration;
  course.date = date ? date : course.date;
  course.url = url;
  course.platform = platform;
  if (!title) {
    res.status(404).send({
      status: 404,
      message: 'Todos los campos son obligatorios.',
    });
  } else {
    course.save((err, courseStored) => {
      if (err) {
        if (err.code === 11000) {
          res.status(404).send({ status: 404, message: 'Este título ya existe.' });
        } else {
          res.status(500).send({
            status: 500,
            message: 'Error del servidor, inténtalo más tarde.',
          });
        }
      } else if (!courseStored) {
        res.status(404).send({ status: 403, message: 'Error al enviar la petición.' });
      } else {
        res.status(200).send({ status: 200, message: 'Curso creado correctamente.' });
      }
    });
  }
}

function updateCourse(req, res) {
  const params = req.params;
  let courseData = req.body;
  Education.findByIdAndUpdate({ _id: params.id }, courseData, (err, courseUpdate) => {
    if (err) {
      if (err.code === 11000) {
        res.status(404).send({ status: 404, message: 'Este título ya existe.' });
      } else {
        res.status(500).send({ status: 500, message: 'Error del servidor.' });
      }
    } else if (!courseUpdate) {
      res.status(404).send({ status: 404, message: 'No se ha encontrado el curso.' });
    } else {
      res.status(200).send({ status: 200, message: 'Curso actualizado correctamente.' });
    }
  });
}

function getCourses(req, res) {
  const { page = 1, limit = 10 } = req.query;
  const options = {
    page,
    limit: parseInt(limit),
    sort: { date: 'desc' },
  };
  Education.paginate({}, options, (err, coursesStored) => {
    if (err) {
      res.status(500).send({ status: 500, message: 'Error del servidor.' });
    } else {
      if (coursesStored.docs.length === 0) {
        res.status(404).send({ status: 404, message: 'No se ha encontrado ningun curso.' });
      } else {
        res.status(200).send({ status: 200, courses: coursesStored });
      }
    }
  });
}

function getCourse(req, res) {
  const { url } = req.params;
  Education.findOne({ url }, (err, courseStored) => {
    if (err) {
      res.status(500).send({ status: 500, message: 'Error del servidor.' });
    } else if (!courseStored) {
      res.status(404).send({ status: 404, message: 'No se ha encontrado el curso.' });
    } else {
      res.status(200).send({ status: 200, course: courseStored });
    }
  });
}

function getNextCourse(req, res) {
  const { url } = req.params;
  Education.find()
    .sort({ date: 'desc' })
    .exec((err, coursesStored) => {
      if (err) {
        res.status(500).send({ status: 500, message: 'Error del servidor.' });
      } else {
        if (!coursesStored) {
          res.status(404).send({
            status: 404,
            message: 'No se ha encontrado ningún curso.',
          });
        } else {
          const coursesUrl = [];
          for (let i = 0; i < coursesStored.length; i++) {
            coursesUrl.push(coursesStored[i].url);
          }
          res.status(200).send({ status: 200, nextCourse: coursesUrl.cycle(url) });
        }
      }
    });
}

function getPrevCourse(req, res) {
  const { url } = req.params;
  Education.find()
    .sort({ date: 'desc' })
    .exec((err, coursesStored) => {
      if (err) {
        res.status(500).send({ status: 500, message: 'Error del servidor.' });
      } else {
        if (!coursesStored) {
          res.status(404).send({
            status: 404,
            message: 'No se ha encontrado ningún curso.',
          });
        } else {
          const coursesUrl = [];
          for (let i = 0; i < coursesStored.length; i++) {
            coursesUrl.push(coursesStored[i].url);
          }
          const coursesUrlReversed = coursesUrl.reverse();
          res.status(200).send({ status: 200, prevCourse: coursesUrlReversed.cycle(url) });
        }
      }
    });
}

function uploadImage(req, res) {
  const params = req.params;
  Education.findById({ _id: params.id }, (err, courseData) => {
    if (err) {
      res.status(500).send({ status: 500, message: 'Error del servidor.' });
    } else if (!courseData) {
      res.status(404).send({ status: 404, message: 'No se ha encontrado el curso.' });
    } else {
      let course = courseData;
      const imageOld = course.image;
      const filePathOld = './uploads/education/' + imageOld;
      const filePathThumbOld = './uploads/education/thumb_' + imageOld;
      if (req.files.image) {
        let filePath = req.files.image.path;
        let fileSplit = filePath.split('/');
        let fileName = fileSplit[2];
        let extSplit = fileName.split('.');
        let fileExt = extSplit[1];
        if (req.files.image.type === null) {
          res.status(404).send({ status: 404, message: 'La imágen es obligatoria.' });
        } else if (fileExt !== 'jpg' && fileExt !== 'jpeg' && fileExt !== 'JPG' && fileExt !== 'png') {
          res.status(400).send({
            status: 400,
            message: 'La extensión de la imagen no es válida. (Extensiones permitidas: .png y .jpg)',
          });
        } else {
          course.image = fileName;
          Education.findByIdAndUpdate({ _id: params.id }, course, (err, courseResult) => {
            if (err) {
              res.status(500).send({ status: 500, message: 'Error del servidor.' });
            } else if (!courseResult) {
              res.status(404).send({
                status: 404,
                message: 'No se ha encontrado el curso.',
              });
            } else {
              if (imageOld !== undefined) {
                fs.unlinkSync(filePathOld);
                fs.unlinkSync(filePathThumbOld);
              }
              const filePathNew = './uploads/education/' + fileName;
              sharp(filePathNew)
                .resize(318, 191)
                .toFile('./uploads/education/thumb_' + fileName, (err) => {
                  if (err) {
                    res.status(500).send({
                      status: 500,
                      message: 'Error al procesar la imagen.',
                    });
                  } else {
                    res.status(200).send({
                      status: 200,
                      message: 'Imágen añadida correctamente.',
                      image: fileName,
                    });
                  }
                });
            }
          });
        }
      } else {
        res.status(500).send({ status: 404, message: 'Ningún archivo subido.' });
      }
    }
  });
}

function getImage(req, res) {
  const imageName = req.params.imageName;
  const filePath = './uploads/education/' + imageName;
  fs.exists(filePath, (exists) => {
    if (!exists) {
      res.status(404).send({ message: 'La imagen que buscas no existe.' });
    } else {
      res.sendFile(path.resolve(filePath));
    }
  });
}

function addTag(req, res) {
  const params = req.params;
  let courseTag = req.body;
  if (courseTag.length === 0) {
    res.status(400).send({ status: 400, message: 'Introduce el tag.' });
  } else {
    Education.findById({ _id: params.id }, (err, tagMatch) => {
      if (tagMatch.tags) {
        let tags = tagMatch.tags;
        let match = tags.includes(courseTag.tags);
        if (err) {
          res.status(500).send({ status: 500, message: 'Error del servidor.' });
        } else if (!tagMatch) {
          res.status(404).send({ status: 404, message: 'No se ha encontrado el curso.' });
        } else if (match) {
          res.status(404).send({ status: 404, message: 'Ya existe este tag.' });
        } else {
          Education.findByIdAndUpdate({ _id: params.id }, { $push: courseTag }, (err, courseData) => {
            if (err) {
              res.status(500).send({ status: 500, message: 'Error del servidor.' });
            } else if (!courseData) {
              res.status(404).send({
                status: 404,
                message: 'No se ha encontrado el curso.',
              });
            } else {
              res.status(200).send({ status: 200, message: 'Tag añadido correctamente.' });
            }
          });
        }
      } else {
        res.status(500).send({
          status: 500,
          message: "Cannot read property 'tags' of null.",
        });
      }
    });
  }
}

function deleteTag(req, res) {
  const params = req.params;
  let courseTag = req.body;
  Education.findByIdAndUpdate({ _id: params.id }, { $pullAll: courseTag }, (err, courseData) => {
    if (err) {
      res.status(500).send({ status: 500, message: 'Error del servidor.' });
    } else if (!courseData) {
      res.status(404).send({ status: 404, message: 'No se ha encontrado el curso.' });
    } else {
      res.status(200).send({ status: 200, message: 'Tag eliminado correctamente.' });
    }
  });
}

function deleteCourse(req, res) {
  const params = req.params;
  Education.findByIdAndDelete({ _id: params.id }, (err, courseDeleted) => {
    if (err) {
      res.status(500).send({ status: 500, message: 'Error del servidor.' });
    } else if (!courseDeleted) {
      res.status(404).send({ status: 404, message: 'No se ha encontrado el curso.' });
    } else {
      let image = courseDeleted.image;
      if (image !== undefined) {
        let filePathOld = './uploads/education/' + image;
        let filePathThumbOld = './uploads/education/thumb_' + image;
        fs.unlinkSync(filePathOld);
        fs.unlinkSync(filePathThumbOld);
      }
      res.status(200).send({
        status: 200,
        message: 'Curso eliminado correctamente.',
        course: courseDeleted,
      });
    }
  });
}

Array.prototype.cycle = function (str) {
  const i = this.indexOf(str);
  if (i === -1) return undefined;
  return this[(i + 1) % this.length];
};

module.exports = {
  addCourse,
  getCourses,
  getCourse,
  getNextCourse,
  getPrevCourse,
  uploadImage,
  addTag,
  updateCourse,
  deleteTag,
  getImage,
  deleteCourse,
};
