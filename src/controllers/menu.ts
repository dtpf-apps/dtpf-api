import { Request, Response } from 'express';
import Menu from '../models/menu';

export async function addMenu(req: Request, res: Response) {
  try {
    const { title, url, order, active } = req.body;
    if (!title) {
      return res.status(404).send({ status: 404, message: 'El título es obligatorio.' });
    }
    const menu = new Menu({ title, url, order, active });
    const createdMenu = await menu.save();
    if (!createdMenu) {
      return res.status(404).send({ status: 404, message: 'Error al crear el menú.' });
    }
    return res.status(200).send({ status: 200, message: 'Menú creado correctamente.' });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function getMenus(_req: Request, res: Response) {
  try {
    const menusStored = await Menu.find().sort({ order: 'asc' });
    if (!menusStored) {
      return res
        .status(404)
        .send({ status: 404, message: 'No se ha encontrado ningún elemento en el menú.' });
    }
    return res.status(200).send({ status: 200, menu: menusStored });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function updateMenu(req: Request, res: Response) {
  try {
    const menuData = req.body;
    const { id } = req.params;
    const menuUpdate = await Menu.findByIdAndUpdate(id, menuData);
    if (!menuUpdate) {
      return res.status(404).send({ status: 404, message: 'No se ha encontrado ningún menú.' });
    }
    return res.status(200).send({ status: 200, message: 'Menú actualizado correctamente.' });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function activateMenu(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { active } = req.body;
    const menuStored = await Menu.findByIdAndUpdate(id, { active });
    if (!menuStored) {
      return res.status(404).send({ status: 404, message: 'No se ha encontrado el menú.' });
    }
    const message = active === true ? 'Menú activado correctamente.' : 'Menú desactivado correctamente.';
    return res.status(200).send({ status: 200, message });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function deleteMenu(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const menuDeleted = await Menu.findByIdAndDelete(id);
    if (!menuDeleted) {
      return res.status(404).send({ status: 404, message: 'Menú no encontrado.' });
    }
    return res.status(200).send({ status: 200, message: 'El menú ha sido eliminado correctamente.' });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}
