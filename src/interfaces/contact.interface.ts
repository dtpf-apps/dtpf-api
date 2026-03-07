import { Document } from 'mongoose';

export interface IContact {
  email: string;
  name: string;
  message: string;
  date: Date;
}

export interface IContactDocument extends IContact, Document {}
