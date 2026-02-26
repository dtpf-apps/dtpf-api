import { Document } from 'mongoose';

export interface IEducation {
  title: string;
  description: string;
  duration: number;
  image: string;
  platform: string;
  link: string;
  tags: string[];
  url: string;
  date: Date;
}

export interface IEducationDocument extends IEducation, Document {}
