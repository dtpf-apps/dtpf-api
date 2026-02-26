import { Request, Response } from 'express';
import AboutMe from '../models/aboutMe';

export async function addAboutMeInfo(req: Request, res: Response) {
  try {
    const { title, content1, content2, content3, content4, content5, content6 } = req.body;
    if (!title || !content1) {
      return res.status(404).send({ message: 'La información principal es obligatoria.' });
    }
    const aboutMe = new AboutMe({ title, content1, content2, content3, content4, content5, content6 });
    const createdMainInfo = await aboutMe.save();
    if (!createdMainInfo) {
      return res.status(404).send({ message: 'Error al crear la información principal.' });
    }
    return res.status(200).send({ message: 'Información creada correctamente.' });
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as { code: number }).code === 11000) {
      return res.status(500).send({ message: 'El título ya existe.' });
    }
    return res.status(500).send({ message: 'Error del servidor.' });
  }
}

export async function getAboutMeInfo(req: Request, res: Response) {
  try {
    const { title } = req.params;
    const info = await AboutMe.findOne({ title });
    if (!info) {
      return res.status(404).send({ message: 'Error al enviar los parámetros.' });
    }
    return res.status(200).send({
      info: {
        title: info.title,
        content1: info.content1,
        content2: info.content2,
        content3: info.content3,
        content4: info.content4,
        content5: info.content5,
        content6: info.content6,
      },
    });
  } catch {
    return res.status(500).send({ message: 'Error del servidor.' });
  }
}

export async function updateAboutMeInfo(req: Request, res: Response) {
  try {
    const { title } = req.params;
    const { content1, content2, content3, content4, content5, content6 } = req.body;
    if (!content1) {
      return res.status(404).send({ message: 'El contenido no puede estar vacío.' });
    }
    const updatedMainInfo = await AboutMe.findOneAndUpdate(
      { title },
      { content1, content2, content3, content4, content5, content6 }
    );
    if (!updatedMainInfo) {
      return res.status(404).send({ message: 'No se ha podido actualizar.' });
    }
    return res.status(200).send({ message: 'Información principal actualizada correctamente.' });
  } catch {
    return res.status(500).send({ message: 'Error del servidor.' });
  }
}
