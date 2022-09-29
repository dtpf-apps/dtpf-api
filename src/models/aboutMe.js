const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AboutMeSchema = Schema({
  id: {
    unique: true,
    type: Number,
  },
  mainInfo: String
});

module.exports = mongoose.model("AboutMe", AboutMeSchema);
