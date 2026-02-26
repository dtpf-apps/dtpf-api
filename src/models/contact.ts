import mongoose, { Schema } from 'mongoose';
import { IContactDocument } from '../interfaces';

const ContactSchema = new Schema<IContactDocument>({
  email: { type: String },
  name: { type: String },
  phone_number: { type: String },
  subject: { type: String },
  message: { type: String },
  readed: { type: Boolean },
  date: { type: Date, default: Date.now },
});

export default mongoose.model<IContactDocument>('Contact', ContactSchema);
