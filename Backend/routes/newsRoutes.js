const express = require('express');
const { processNews } = require('../controllers/newsController.js');
const { fetchAndSaveNews } = require('../controllers/fetchAndSaveNews');

const router = express.Router();

router.get('/process', processNews); // Route to summarize news, generate transcript, and audio
router.get('/fetch-news', fetchAndSaveNews);

module.exports = router;
