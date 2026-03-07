import mongoose, { Schema } from 'mongoose';
import { IContactDocument } from '../interfaces';

const ContactSchema = new Schema<IContactDocument>({
  email: { type: String, required: true },
  name: { type: String, default: '' },
  message: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

export default mongoose.model<IContactDocument>('Contact', ContactSchema);
