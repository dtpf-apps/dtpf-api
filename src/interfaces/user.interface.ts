import { Document } from 'mongoose';

export interface IUser {
  name: string;
  lastname: string;
  email: string;
  password: string;
  role: 'admin' | 'editor' | 'reviewer';
  active: boolean;
  avatar: string;
}

export interface IUserDocument extends IUser, Document {}
