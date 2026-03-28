import mongoose, { Schema } from 'mongoose';
import { IContactDocument } from '../interfaces';

const ContactSchema = new Schema<IContactDocument>({
  email: { type: String, required: true, trim: true, maxlength: 254, index: true },
  name: { type: String, default: '', trim: true, maxlength: 100 },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
  date: { type: Date, default: Date.now },
});

export default mongoose.model<IContactDocument>('Contact', ContactSchema);
