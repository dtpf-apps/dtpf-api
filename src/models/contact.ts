import { Schema, model } from 'mongoose';
import type { IContact } from '../interfaces';
import { CONTACT_LIMITS } from '../schemas/contact.schema';

const ContactSchema = new Schema<IContact>({
  email: { type: String, required: true, trim: true, maxlength: CONTACT_LIMITS.emailMax, index: true },
  name: { type: String, default: '', trim: true, maxlength: CONTACT_LIMITS.nameMax },
  message: { type: String, required: true, trim: true, maxlength: CONTACT_LIMITS.messageMax },
  date: { type: Date, default: Date.now },
});

export default model<IContact>('Contact', ContactSchema);
