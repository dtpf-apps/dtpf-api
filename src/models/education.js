const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

const EducationSchema = Schema({
  title: { unique: true, type: String },
  description: String,
  duration: Number,
  image: String,
  platform: String,
  link: String,
  tags: [],
  url: { unique: true, type: String },
  date: { type: Date, default: Date.now },
});
EducationSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Education', EducationSchema);
