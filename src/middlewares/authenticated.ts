import { Response, NextFunction } from 'express';
import jwt from 'jwt-simple';
import moment from 'moment';
import config from '../config/config';
import { IRequestUser } from '../interfaces';

export function ensureAuth(req: IRequestUser, res: Response, next: NextFunction) {
  if (!req.headers.authorization) {
    return res.status(403).send({ message: 'La petición no tiene cabecera de autentificación.' });
  }
  const token = req.headers.authorization.replace(/['"]+/g, '');
  try {
    const payload = jwt.decode(token, config.app.SECRET_KEY);
    if (payload.exp <= moment().unix()) {
      return res.status(401).send({ message: 'El token ha expirado.' });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).send({ message: 'Token inválido.' });
  }
}
