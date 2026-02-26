import { Request, Response } from 'express';
import Utils from '../models/utils';

export function connection(_req: Request, res: Response) {
  return res.status(200).send({ status: 200 });
}

export async function createReloadMessages(_req: Request, res: Response) {
  try {
    const util = new Utils({ id: 1, reloadMessages: true });
    const utilStored = await util.save();
    if (!utilStored) {
      return res.status(404).send({ status: 404, message: 'Error al crear el útil.' });
    }
    return res.status(200).send({ status: 200, message: 'Útil creado correctamente.', utilStored });
  } catch {
    return res.status(400).send({ status: 400, message: 'El util ya existe.' });
  }
}

export async function createIndexedDBVersion(_req: Request, res: Response) {
  try {
    const util = new Utils({ id: 2, indexedDBVersion: 1 });
    const utilStored = await util.save();
    if (!utilStored) {
      return res.status(404).send({ status: 404, message: 'Error al crear el útil.' });
    }
    return res.status(200).send({ status: 200, message: 'Útil creado correctamente.', utilStored });
  } catch {
    return res.status(400).send({ status: 400, message: 'El util ya existe.' });
  }
}

export async function getIndexedDBVersion(_req: Request, res: Response) {
  try {
    const idbVersion = await Utils.findOne({ id: 2 });
    if (!idbVersion) {
      return res.status(404).send({ status: 404, message: 'Error al enviar los parámetros.' });
    }
    return res.status(200).send({ indexedDBVersion: idbVersion.indexedDBVersion });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function updateIndexedDBVersion(_req: Request, res: Response) {
  try {
    const idbVersion = await Utils.findOne({ id: 2 });
    if (!idbVersion) {
      return res.status(404).send({ status: 404, message: 'Error al enviar los parámetros.' });
    }
    const version = idbVersion.indexedDBVersion;
    const versionStored = await Utils.findOneAndUpdate({ id: 2 }, { indexedDBVersion: version + 1 });
    if (!versionStored) {
      return res.status(404).send({ status: 404, message: 'No hay parámetros.' });
    }
    return res
      .status(200)
      .send({ status: 200, message: 'IndexedDB actualizada correctamente.', indexedDBVersion: version + 1 });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function messagesStatus(_req: Request, res: Response) {
  try {
    const statusStored = await Utils.findOne({ id: 1 });
    if (!statusStored) {
      return res.status(404).send({ status: 404, message: 'Error al enviar los parámetros.' });
    }
    return res.status(200).send({ messagesStatus: statusStored.reloadMessages });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function reloadMessages(req: Request, res: Response) {
  try {
    const { haveToReload } = req.params;
    let message: string;
    if (haveToReload === 'true') {
      message = 'Mensaje enviado.';
    } else {
      message = 'Mensaje leído.';
    }
    const reload = await Utils.findOneAndUpdate({ id: 1 }, { reloadMessages: haveToReload });
    if (!reload) {
      return res.status(404).send({ status: 404, message: 'No hay parámetro.' });
    }
    return res.status(200).send({ status: 200, message });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}
