import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import * as jwtService from '../services/jwt';
import User from '../models/user';
import { IRequestUser } from '../interfaces';

export async function signUp(req: Request, res: Response) {
  try {
    const { name, lastname, email, password, repeatPassword } = req.body;

    if (!password || !repeatPassword) {
      return res.status(404).send({ message: 'Las contraseñas son obligatorias.' });
    }
    if (password !== repeatPassword) {
      return res.status(404).send({ message: 'Las contraseñas tienen que ser iguales.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      lastname,
      email: email.toLowerCase(),
      password: hash,
      role: 'editor',
      active: false,
    });
    const userStored = await user.save();
    if (!userStored) {
      return res.status(404).send({ message: 'Error al crear el usuario.' });
    }

    setTimeout(() => {
      const { password: _, __v: __, ...userObj } = userStored.toObject();
      res.status(200).send({ message: 'Usuario creado correctamente.', user: userObj });
    }, 5000);
  } catch {
    return res.status(400).send({ message: 'El usuario ya existe.' });
  }
}

export async function signIn(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const userStored = await User.findOne({ email: email.toLowerCase() });

    if (!userStored) {
      return res.status(404).send({ message: 'Usuario no encontrado.' });
    }

    const check = await bcrypt.compare(password, userStored.password);
    if (!check) {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          res.status(404).send({ message: 'La contraseña es incorrecta.' });
          resolve();
        }, 5000);
      });
    }

    if (!userStored.active) {
      return res.status(200).send({ message: 'El usuario no se ha activado.' });
    }

    return res.status(200).send({
      accessToken: jwtService.createAccessToken(userStored),
      refreshToken: jwtService.createRefreshToken(userStored),
    });
  } catch {
    return res.status(500).send({ message: 'Error del servidor.' });
  }
}

export async function getUsers(_req: Request, res: Response) {
  try {
    const users = await User.find();
    if (!users) {
      return res.status(404).send({ message: 'No se ha encontrado ningún usuario.' });
    }
    return res.status(200).send({
      users: users.map((user) => {
        const { password: _, __v: __, ...userObj } = user.toObject();
        return userObj;
      }),
    });
  } catch {
    return res.status(500).send({ message: 'Error del servidor.' });
  }
}

export async function uploadAvatar(req: IRequestUser, res: Response) {
  try {
    const { id } = req.params;
    const userData = await User.findById(id);
    if (!userData) {
      return res.status(404).send({ message: 'No se ha encontrado ningún usuario.' });
    }

    const file = req.file;
    if (!file) {
      return res.status(404).send({ message: 'Sube la imágen.' });
    }

    const fileName = file.filename;
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (fileExt !== '.png' && fileExt !== '.jpg' && fileExt !== '.jpeg') {
      fs.unlinkSync(file.path);
      return res.status(400).send({
        message: 'La extensión de la imagen no es válida. (Extensiones permitidas: .png y .jpg)',
      });
    }

    const avatarNameOld = userData.avatar;
    const userResult = await User.findByIdAndUpdate(id, { avatar: fileName });
    if (!userResult) {
      return res.status(404).send({ message: 'No se ha encontrado ningún usuario.' });
    }

    if (avatarNameOld) {
      const filePathOld = path.join('./uploads/avatar', avatarNameOld);
      if (fs.existsSync(filePathOld)) {
        fs.unlinkSync(filePathOld);
      }
    }

    return res.status(200).send({ avatarName: fileName });
  } catch {
    return res.status(500).send({ message: 'Error del servidor.' });
  }
}

export function getAvatar(req: Request, res: Response) {
  const avatarName = req.params.avatarName as string;
  const filePath = path.join('./uploads/avatar', avatarName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send({ message: 'El avatar que buscas no existe.' });
  }
  return res.sendFile(path.resolve(filePath));
}

export async function updateUser(req: Request, res: Response) {
  try {
    const userData = req.body;
    const { id } = req.params;

    if (userData.email) {
      userData.email = userData.email.toLowerCase();
    }

    if (userData.password && userData.repeatPassword) {
      if (userData.password !== userData.repeatPassword) {
        return res.status(404).send({ message: 'Las contraseñas tienen que ser iguales.' });
      }
      userData.password = await bcrypt.hash(userData.password, 10);
      delete userData.repeatPassword;
    }

    const userUpdate = await User.findByIdAndUpdate(id, userData);
    if (!userUpdate) {
      return res.status(404).send({ message: 'No se ha encontrado ningún usuario.' });
    }
    return res.status(200).send({ message: 'Usuario actualizado correctamente.' });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'codeName' in error &&
      (error as { codeName: string }).codeName === 'DuplicateKey'
    ) {
      return res.status(500).send({ message: 'Este email ya existe en la base de datos.' });
    }
    return res.status(500).send({ message: 'Error del servidor.' });
  }
}

export async function activateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { active } = req.body;
    const userStored = await User.findByIdAndUpdate(id, { active });
    if (!userStored) {
      return res.status(404).send({ status: 404, message: 'No se ha encontrado el usuario.' });
    }
    const message =
      active === true ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.';
    return res.status(200).send({ status: 200, message });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userDelete = await User.findByIdAndDelete(id);
    if (!userDelete) {
      return res.status(404).send({ status: 404, message: 'Usuario no encontrado.' });
    }
    if (userDelete.avatar) {
      const filePathToDelete = path.join('./uploads/avatar', userDelete.avatar);
      if (fs.existsSync(filePathToDelete)) {
        fs.unlinkSync(filePathToDelete);
      }
    }
    return res.status(200).send({ status: 200, message: 'El usuario ha sido eliminado correctamente.' });
  } catch {
    return res.status(500).send({ status: 500, message: 'Error del servidor.' });
  }
}

export async function signUpAdmin(req: Request, res: Response) {
  try {
    const { name, lastname, email, role, password } = req.body;
    if (!password) {
      return res.status(500).send({ message: 'La contraseña es obligatoria.', status: 500 });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      lastname,
      email: email.toLowerCase(),
      role,
      active: true,
      password: hash,
    });
    const userStored = await user.save();
    if (!userStored) {
      return res.status(500).send({ message: 'Error al crear el usuario.', status: 500 });
    }
    return res.status(200).send({ user: userStored, message: 'Usuario creado correctamente.', status: 200 });
  } catch {
    return res.status(500).send({ message: 'El usuario ya existe.', status: 500 });
  }
}
