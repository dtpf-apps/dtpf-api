import { Document } from 'mongoose';

export interface IMenu {
  title: string;
  url: string;
  order: number;
  active: boolean;
}

export interface IMenuDocument extends IMenu, Document {}
