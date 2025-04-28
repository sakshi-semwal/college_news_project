const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: String,
  content: String,
  summary: String,
  transcript: String,
  audioPath: String,
  rawData: Object,
});

module.exports = mongoose.model('News', newsSchema);
