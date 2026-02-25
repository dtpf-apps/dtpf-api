const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AboutMeSchema = Schema({
  title: {
    unique: true,
    type: String,
  },
  content1: String,
  content2: String,
  content3: String,
  content4: String,
  content5: String,
  content6: String,
});

module.exports = mongoose.model('AboutMe', AboutMeSchema);
