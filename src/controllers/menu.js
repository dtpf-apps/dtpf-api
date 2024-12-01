const Menu = require("../models/menu");

function addMenu(req, res) {
  const { title, url, order, active } = req.body;
  const menu = new Menu();
  menu.title = title;
  menu.url = url;
  menu.order = order;
  menu.active = active;
  if (!menu.title) {
    res.status(404).send({ status: 404, message: "El título es obligatorio." });
  } else {
    menu.save((err, createdMenu) => {
      if (err) {
        res.status(500).send({ status: 500, message: "Error del servidor." });
      }  else {
          if (!createdMenu) {
            res.status(404).send({ status: 404, message: "Error al crear el menú." });
          } else {
            res.status(200).send({ status: 200, message: "Menú creado correctamente." });
          }        
      }
    });
  }
}

function getMenus(req, res) {
  Menu.find()
    .sort({ order: "asc" })
    .exec((err, menusStored) => {
      if (err) {
        res.status(500).send({ status: 500, message: "Error del servidor." });
      } else {
        if (!menusStored) {
          res.status(404).send({
            status: 404,
            message: "No se ha encontrado ningún elemento en el menú."
          });
        } else {
          res.status(200).send({ status: 200, menu: menusStored });
        }
      }
    });
}

function updateMenu(req,res) {
  let menuData = req.body;
  const params = req.params;
  Menu.findByIdAndUpdate(params.id, menuData, (err, menuUpdate) => {
    if(err) {
      res.status(500).send({ status: 500, message: "Error del servidor." });
    } else {
      if(!menuUpdate) {
        res.status(404).send({ status: 404, message: "No se ha encontrado ningún menú." });
      } else {
        res.status(200).send({ status: 200, message: "Menú actualizado correctamente." });
      }
    }
  });
}

function activateMenu(req, res) {
  const { id } = req.params;
  const { active } = req.body;
  Menu.findByIdAndUpdate(id, { active }, (err, menuStored) => {
    if(err) {
      res.status(500).send({ status: 500, message: "Error del servidor." });
    } else {
      if(!menuStored) {
        res.status(404).send({ status: 404, message: "No se ha encontrado el menú." });
      } else {
        if(active === true) {
          res.status(200).send({ status: 200, message: "Menú activado correctamente." })
        } else {
          res.status(200).send({ status: 200, message: "Menú desactivado correctamente." })
        }
      }
    }
  });
}

function deleteMenu(req, res) {
  const { id } = req.params;
  Menu.findByIdAndRemove(id, (err, menuDeleted) => {
    if(err) {
      res.status(500).send({ status: 500, message: "Error del servidor." });
    } else {
      if(!menuDeleted) {
        res.status(404).send({ status: 404, message: "Menú no encontrado." });
      } else {
        res.status(200).send({ status: 200, message: "El menú ha sido eliminado correctamente." });
      }
    }
  });
}

module.exports = {
  addMenu,
  getMenus,
  updateMenu,
  activateMenu,
  deleteMenu
};
