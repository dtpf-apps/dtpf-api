import { Request, Response } from 'express';
import Contact from '../models/contact';

export async function contactMe(req: Request, res: Response) {
  try {
    const { email, name, phone_number, subject, message } = req.body;
    if (!email && !message) {
      return res.status(404).send({ status: 404, message: 'El email y el mensaje son obligatorios.' });
    } else if (!email) {
      return res.status(404).send({ status: 404, message: 'El email es obligatorio.' });
    } else if (!message) {
      return res.status(404).send({ status: 404, message: 'El mensaje es obligatorio.' });
    }

    const contacts = await Contact.find({ email: email.toLowerCase() });
    const lastContact = contacts[contacts.length - 1];

    if (lastContact && lastContact.readed === false) {
      return res.status(404).send({
        status: 404,
        message: 'Hasta que no lea el último mensaje que has enviado no puedes enviar más.',
      });
    }

    const contact = new Contact({
      email: email.toLowerCase(),
      name,
      phone_number,
      subject,
      message,
      readed: false,
    });
    const contactStored = await contact.save();
    if (!contactStored) {
      return res.status(404).send({ status: 404, message: 'Error al enviar la petición.' });
    }
    return res.status(200).send({ status: 200, contact: contactStored });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function getMessagesUnread(req: Request, res: Response) {
  try {
    const readed = req.query.readed === 'true';
    const messagesStored = await Contact.find({ readed }).sort({ date: 'desc' });
    if (!messagesStored) {
      return res.status(404).send({ status: 404, message: 'No hay mensajes en la base de datos.' });
    }
    return res.status(200).send({ status: 200, messages: messagesStored });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function checkMessage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { readed } = req.body;
    const messageChecked = await Contact.findByIdAndUpdate(id, { readed });
    if (!messageChecked) {
      return res.status(404).send({ status: 404, message: 'No se ha encontrado el mensaje.' });
    }
    const message =
      readed === true ? 'Mensaje marcado como leído.' : 'Mensaje sacado de la bandeja de leídos.';
    return res.status(200).send({ status: 200, message });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function deleteMessage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const messageDelete = await Contact.findByIdAndDelete(id);
    if (!messageDelete) {
      return res.status(404).send({ status: 404, message: 'Mensaje no encontrado en la base de datos.' });
    }
    return res.status(200).send({ status: 200, message: 'Mensaje eliminado correctamente.' });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function getLastMessageEmail(_req: Request, res: Response) {
  try {
    const messagesStored = await Contact.find({ readed: false }).sort({ date: 'desc' });
    if (!messagesStored || messagesStored.length === 0) {
      return res.status(200).send({ status: 200, message: 'Bandeja de entrada vacía.' });
    }
    return res.status(200).send({ status: 200, email: messagesStored[0].email });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}
