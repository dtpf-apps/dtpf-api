import { Document } from 'mongoose';

export interface IAboutMe {
  title: string;
  content1: string;
  content2: string;
  content3: string;
  content4: string;
  content5: string;
  content6: string;
}

export interface IAboutMeDocument extends IAboutMe, Document {}
