import jwt from 'jwt-simple';
import moment from 'moment';
import config from '../config/config';
import { IUserDocument, IJwtPayload } from '../interfaces';

export function createAccessToken(user: IUserDocument): string {
  const payload = {
    id: user._id,
    name: user.name,
    lastname: user.lastname,
    email: user.email,
    role: user.role,
    createToken: moment().unix(),
    exp: moment().add(24, 'hours').unix(),
  };
  return jwt.encode(payload, config.app.SECRET_KEY);
}

export function createRefreshToken(user: IUserDocument): string {
  const payload = {
    id: user._id,
    exp: moment().add(24, 'hours').unix(),
  };
  return jwt.encode(payload, config.app.SECRET_KEY);
}

export function decodedToken(token: string): IJwtPayload {
  return jwt.decode(token, config.app.SECRET_KEY, true);
}
