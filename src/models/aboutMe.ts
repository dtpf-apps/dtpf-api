import mongoose, { Schema } from 'mongoose';
import { IAboutMeDocument } from '../interfaces';

const AboutMeSchema = new Schema<IAboutMeDocument>({
  title: { type: String, unique: true },
  content1: { type: String },
  content2: { type: String },
  content3: { type: String },
  content4: { type: String },
  content5: { type: String },
  content6: { type: String },
});

export default mongoose.model<IAboutMeDocument>('AboutMe', AboutMeSchema);
