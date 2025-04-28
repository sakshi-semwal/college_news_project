const express = require('express');
const {
  processNews,
  generateCombinedSpeech,
  mergeAudioChunksFromFolder,
} = require('../controllers/newsController.js');
const { fetchAndSaveNews } = require('../controllers/fetchAndSaveNews');
const {generateNewspaperPDF} = require('../controllers/generateNewspaperPDF.js')
const router = express.Router();

router.get('/process', processNews); // Route to summarize news, generate transcript, and audio
router.get('/fetch-news', fetchAndSaveNews);
router.get('/generate-combined-speech', generateCombinedSpeech);
router.get('/merge', mergeAudioChunksFromFolder);
router.get('/generate-pdf', generateNewspaperPDF)
module.exports = router;
