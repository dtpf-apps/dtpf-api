import { Request, Response } from 'express';
import * as jwtService from '../services/jwt';
import moment from 'moment';
import User from '../models/user';

function willExpireToken(token: string): boolean {
  const { exp } = jwtService.decodedToken(token);
  const currentDate = moment().unix();
  return currentDate > exp;
}

export async function refreshAccessToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    const isTokenExpired = willExpireToken(refreshToken);

    if (isTokenExpired) {
      return res.status(404).send({ message: 'El refreshToken ha expirado.' });
    }

    const { id } = jwtService.decodedToken(refreshToken);
    const userStored = await User.findById(id);

    if (!userStored) {
      return res.status(404).send({ message: 'Usuario no encontrado.' });
    }

    return res.status(200).send({
      accessToken: jwtService.createAccessToken(userStored),
      refreshToken,
    });
  } catch {
    return res.status(500).send({ message: 'Error del servidor.' });
  }
}
