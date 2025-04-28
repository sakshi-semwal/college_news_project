const mongoose = require('mongoose');

const combinedSpeechSchema = new mongoose.Schema({
  category: String,
  transcript: String, // original full text
  summary: String, // summarized version
  audioPath: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('CombinedSpeech', combinedSpeechSchema);
