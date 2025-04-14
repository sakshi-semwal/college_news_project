const mongoose = require('mongoose');

const combinedSpeechSchema = new mongoose.Schema({
  category: String,
  combinedText: String,
  audioPath: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('CombinedSpeech', combinedSpeechSchema);
