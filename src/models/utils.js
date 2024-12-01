const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UtilsSchema = Schema({
  id: {
    unique: true,
    type: Number,
  },
  reloadMessages: Boolean,
  indexedDBVersion: Number,
});

module.exports = mongoose.model("Utils", UtilsSchema);
