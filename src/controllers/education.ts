import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Request, Response } from 'express';
import Education from '../models/education';
import { IRequestUser } from '../interfaces';

function cycleNext(arr: string[], str: string): string | undefined {
  const i = arr.indexOf(str);
  if (i === -1) return undefined;
  return arr[(i + 1) % arr.length];
}

export async function addCourse(req: Request, res: Response) {
  try {
    const { title, description, duration, date, url, platform } = req.body;
    if (!title) {
      return res.status(404).send({ status: 404, message: 'Todos los campos son obligatorios.' });
    }
    const course = new Education({
      title,
      description,
      duration,
      date: date || undefined,
      url,
      platform,
    });
    const courseStored = await course.save();
    if (!courseStored) {
      return res.status(404).send({ status: 403, message: 'Error al enviar la petición.' });
    }
    return res.status(200).send({ status: 200, message: 'Curso creado correctamente.' });
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as { code: number }).code === 11000) {
      return res.status(404).send({ status: 404, message: 'Este título ya existe.' });
    }
    return res.status(500).send({ status: 500, message: 'Error del servidor, inténtalo más tarde.' });
  }
}

export async function updateCourse(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const courseData = req.body;
    const courseUpdate = await Education.findByIdAndUpdate(id, courseData);
    if (!courseUpdate) {
      return res.status(404).send({ status: 404, message: 'No se ha encontrado el curso.' });
    }
    return res.status(200).send({ status: 200, message: 'Curso actualizado correctamente.' });
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as { code: number }).code === 11000) {
      return res.status(404).send({ status: 404, message: 'Este título ya existe.' });
    }
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function getCourses(req: Request, res: Response) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: { date: 'desc' as const },
    };
    const coursesStored = await (Education as any).paginate({}, options);
    if (coursesStored.docs.length === 0) {
      return res.status(404).send({ status: 404, message: 'No se ha encontrado ningun curso.' });
    }
    return res.status(200).send({ status: 200, courses: coursesStored });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function getCourse(req: Request, res: Response) {
  try {
    const { url } = req.params;
    const courseStored = await Education.findOne({ url });
    if (!courseStored) {
      return res.status(404).send({ status: 404, message: 'No se ha encontrado el curso.' });
    }
    return res.status(200).send({ status: 200, course: courseStored });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function getNextCourse(req: Request, res: Response) {
  try {
    const { url } = req.params;
    const coursesStored = await Education.find().sort({ date: 'desc' });
    if (!coursesStored) {
      return res.status(404).send({ status: 404, message: 'No se ha encontrado ningún curso.' });
    }
    const coursesUrl = coursesStored.map((c) => c.url);
    return res.status(200).send({ status: 200, nextCourse: cycleNext(coursesUrl, url as string) });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function getPrevCourse(req: Request, res: Response) {
  try {
    const { url } = req.params;
    const coursesStored = await Education.find().sort({ date: 'desc' });
    if (!coursesStored) {
      return res.status(404).send({ status: 404, message: 'No se ha encontrado ningún curso.' });
    }
    const coursesUrl = coursesStored.map((c) => c.url).reverse();
    return res.status(200).send({ status: 200, prevCourse: cycleNext(coursesUrl, url as string) });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function uploadImage(req: IRequestUser, res: Response) {
  try {
    const { id } = req.params;
    const courseData = await Education.findById(id);
    if (!courseData) {
      return res.status(404).send({ status: 404, message: 'No se ha encontrado el curso.' });
    }

    const file = req.file;
    if (!file) {
      return res.status(500).send({ status: 404, message: 'Ningún archivo subido.' });
    }

    const fileName = file.filename;
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (fileExt !== '.jpg' && fileExt !== '.jpeg' && fileExt !== '.png') {
      fs.unlinkSync(file.path);
      return res.status(400).send({
        status: 400,
        message: 'La extensión de la imagen no es válida. (Extensiones permitidas: .png y .jpg)',
      });
    }

    const imageOld = courseData.image;
    const courseResult = await Education.findByIdAndUpdate(id, { image: fileName });
    if (!courseResult) {
      return res.status(404).send({ status: 404, message: 'No se ha encontrado el curso.' });
    }

    if (imageOld) {
      const filePathOld = path.join('./uploads/education', imageOld);
      const filePathThumbOld = path.join('./uploads/education', 'thumb_' + imageOld);
      if (fs.existsSync(filePathOld)) fs.unlinkSync(filePathOld);
      if (fs.existsSync(filePathThumbOld)) fs.unlinkSync(filePathThumbOld);
    }

    await sharp(file.path)
      .resize(318, 191)
      .toFile(path.join('./uploads/education', 'thumb_' + fileName));

    return res.status(200).send({ status: 200, message: 'Imágen añadida correctamente.', image: fileName });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export function getImage(req: Request, res: Response) {
  const imageName = req.params.imageName as string;
  const filePath = path.join('./uploads/education', imageName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send({ message: 'La imagen que buscas no existe.' });
  }
  return res.sendFile(path.resolve(filePath));
}

export async function addTag(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const courseTag = req.body;
    if (!courseTag.tags) {
      return res.status(400).send({ status: 400, message: 'Introduce el tag.' });
    }

    const tagMatch = await Education.findById(id);
    if (!tagMatch) {
      return res.status(404).send({ status: 404, message: 'No se ha encontrado el curso.' });
    }

    if (tagMatch.tags && tagMatch.tags.includes(courseTag.tags as string)) {
      return res.status(404).send({ status: 404, message: 'Ya existe este tag.' });
    }

    const courseData = await Education.findByIdAndUpdate(id, { $push: courseTag });
    if (!courseData) {
      return res.status(404).send({ status: 404, message: 'No se ha encontrado el curso.' });
    }
    return res.status(200).send({ status: 200, message: 'Tag añadido correctamente.' });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function deleteTag(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const courseTag = req.body;
    const courseData = await Education.findByIdAndUpdate(id, { $pullAll: courseTag });
    if (!courseData) {
      return res.status(404).send({ status: 404, message: 'No se ha encontrado el curso.' });
    }
    return res.status(200).send({ status: 200, message: 'Tag eliminado correctamente.' });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function deleteCourse(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const courseDeleted = await Education.findByIdAndDelete(id);
    if (!courseDeleted) {
      return res.status(404).send({ status: 404, message: 'No se ha encontrado el curso.' });
    }
    if (courseDeleted.image) {
      const filePathOld = path.join('./uploads/education', courseDeleted.image);
      const filePathThumbOld = path.join('./uploads/education', 'thumb_' + courseDeleted.image);
      if (fs.existsSync(filePathOld)) fs.unlinkSync(filePathOld);
      if (fs.existsSync(filePathThumbOld)) fs.unlinkSync(filePathThumbOld);
    }
    return res
      .status(200)
      .send({ status: 200, message: 'Curso eliminado correctamente.', course: courseDeleted });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}
