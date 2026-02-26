import { Request } from 'express';

export interface IJwtPayload {
  id: string;
  name: string;
  lastname: string;
  email: string;
  role: string;
  createToken: number;
  exp: number;
}

export interface IRequestUser extends Request {
  user: IJwtPayload;
}
