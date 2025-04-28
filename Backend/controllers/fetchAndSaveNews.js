const axios = require('axios');
const News = require('../models/News');

const fetchAndSaveNews = async (req, res) => {
  try {
    const { q = '', category = '', language = '', country = '' } = req.query;
    const NEWS_API_KEY = 'pub_75398e4a88873cbc58e1eaa57c30cb664d346';

    // Split category string into array (e.g. "politics,business" → ['politics','business'])
    const categories = category ? category.split(',') : [''];

    let allFetchedArticles = [];
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Loop through each category
    for (const cat of categories) {
      await sleep(1000); // Ensure API rate limit is respected

      let url = `https://newsdata.io/api/1/latest?apikey=${NEWS_API_KEY}`;
      if (q) url += `&q=${encodeURIComponent(q)}`;
      if (language) url += `&language=${language}`;
      if (country) url += `&country=${country}`;
      if (cat) url += `&category=${cat}`;

      // Wrap the fetch request for each category in try-catch
      try {
        console.log(`Fetching: ${cat} - ${url}`);

        const response = await axios.get(url, {
          headers: { 'Content-Type': 'application/json' },
        });

        const newsList = response.data.results;

        // Process and save articles if there are results
        if (newsList && newsList.length > 0) {
          for (const article of newsList) {
            const title = article.title || 'Untitled';
            const content = article.description || article.content || '';

            const exists = await News.findOne({ title, content });
            if (!exists) {
              const newArticle = new News({
                ...article,
                rawData: article,
                title,
                content,
              });
              const saved = await newArticle.save();
              allFetchedArticles.push(saved);
            }
          }
        }
      } catch (error) {
        console.error(
          `%cError fetching news for category ${cat}: ${error.message}`,
          'color: red'
        );
        // Continue with the next category even if the current one fails
      }
    }

    // Respond with all the saved articles and success message
    res.status(201).json({
      message: 'News saved successfully',
      count: allFetchedArticles.length,
      data: allFetchedArticles,
    });
  } catch (error) {
    console.error('Error fetching or saving news:', error.message);
    res.status(500).json({
      message: 'Server Error',
      error: error.message,
    });
  }
};

module.exports = { fetchAndSaveNews };
