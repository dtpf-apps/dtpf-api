import mongoose, { Schema } from 'mongoose';
import { IUserDocument } from '../interfaces';

const UserSchema = new Schema<IUserDocument>({
  name: { type: String },
  lastname: { type: String },
  email: { type: String, unique: true },
  password: { type: String },
  role: { type: String, enum: ['admin', 'editor', 'reviewer'] },
  active: { type: Boolean },
  avatar: { type: String },
});

export default mongoose.model<IUserDocument>('User', UserSchema);
