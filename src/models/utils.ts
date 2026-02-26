import mongoose, { Schema } from 'mongoose';
import { IUtilsDocument } from '../interfaces';

const UtilsSchema = new Schema<IUtilsDocument>({
  id: { type: Number, unique: true },
  reloadMessages: { type: Boolean },
  indexedDBVersion: { type: Number },
});

export default mongoose.model<IUtilsDocument>('Utils', UtilsSchema);
