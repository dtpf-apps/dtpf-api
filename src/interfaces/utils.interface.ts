import { Document } from 'mongoose';

export interface IUtils {
  id: number;
  reloadMessages: boolean;
  indexedDBVersion: number;
}

export interface IUtilsDocument extends IUtils, Document {}
