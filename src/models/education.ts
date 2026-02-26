import mongoose, { Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { IEducationDocument } from '../interfaces';

const EducationSchema = new Schema<IEducationDocument>({
  title: { type: String, unique: true },
  description: { type: String },
  duration: { type: Number },
  image: { type: String },
  platform: { type: String },
  link: { type: String },
  tags: { type: [String] },
  url: { type: String, unique: true },
  date: { type: Date, default: Date.now },
});
EducationSchema.plugin(mongoosePaginate);

export default mongoose.model<IEducationDocument>('Education', EducationSchema);
