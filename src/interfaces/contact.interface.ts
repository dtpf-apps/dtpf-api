import { Document } from 'mongoose';

export interface IContact {
  email: string;
  name: string;
  phone_number: string;
  subject: string;
  message: string;
  readed: boolean;
  date: Date;
}

export interface IContactDocument extends IContact, Document {}
