import mongoose, { Schema } from 'mongoose';
import { IMenuDocument } from '../interfaces';

const MenuSchema = new Schema<IMenuDocument>({
  title: { type: String },
  url: { type: String },
  order: { type: Number },
  active: { type: Boolean },
});

export default mongoose.model<IMenuDocument>('Menu', MenuSchema);
