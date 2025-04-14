const News = require('../models/News');
const CombinedSpeech = require('../models/CombinedSpeech');
const {
  summarizeNews,
  generateTranscript,
  convertTextToSpeech,
} = require('../services/aiService');

async function processNews(req, res) {
  try {
    const newsList = await News.find({ summary: { $exists: false } });

    if (!newsList.length) {
      return res.status(404).json({ message: 'No unprocessed news found!' });
    }

    const categoryIntroMap = {
      sports: "Here is what's happening in sports today:",
      politics: 'In politics today:',
      tech: 'Tech updates include:',
      entertainment: 'Entertainment headlines say:',
      business: 'Business news reveals:',
      world: 'Global headlines include:',
      default: "In today's news:",
    };

    const categorizedNews = {};
    const allSummaries = [];
    const processedResults = [];

    for (const news of newsList) {
      const category = news.category?.toLowerCase() || 'default';
      if (!categorizedNews[category]) categorizedNews[category] = [];
      categorizedNews[category].push(news);
    }

    for (const category in categorizedNews) {
      const intro = categoryIntroMap[category] || categoryIntroMap.default;
      let combinedText = `${intro}\n`;

      for (const news of categorizedNews[category]) {
        try {
          const summary = await summarizeNews(news.content);
          const transcript = await generateTranscript(news.content);
          const audioPath = await convertTextToSpeech(
            summary,
            `news_${category}_${Date.now()}`
          );

          news.summary = summary;
          news.transcript = transcript;
          news.audioPath = audioPath;
          await news.save();

          processedResults.push({ category, summary, transcript, audioPath });
          combinedText += `• ${summary}\n`;
          allSummaries.push(summary);
        } catch (innerError) {
          console.error(
            `❌ Failed to process news in category ${category}:`,
            innerError.message
          );
          // Skip this news item and move on
        }
      }

      // Generate combined audio only if we have at least one summary
      if (combinedText !== `${intro}\n`) {
        try {
          const categoryAudioPath = await convertTextToSpeech(
            combinedText,
            `category_${category}_${Date.now()}`
          );

          await CombinedSpeech.create({
            category,
            combinedText,
            audioPath: categoryAudioPath,
          });

          console.log(`✅ Combined speech for "${category}" saved.`);
        } catch (catError) {
          console.error(
            `❌ Failed to generate combined audio for ${category}:`,
            catError.message
          );
        }
      }
    }

    // ✅ Generate one audio for all news summaries
    if (allSummaries.length > 0) {
      const allSummariesText =
        `Here is a complete summary of today's news:\n` +
        allSummaries.map((s) => `• ${s}`).join('\n');

      try {
        const combinedAudioPath = await convertTextToSpeech(
          allSummariesText,
          `combined_news_${Date.now()}`
        );

        const combinedSpeech = new CombinedSpeech({
          category: 'all',
          combinedText: allSummariesText,
          audioPath: combinedAudioPath,
        });

        await combinedSpeech.save();
        console.log(`✅ Combined audio saved at: ${combinedAudioPath}`);

        return res.json({
          message: `Processed ${processedResults.length} news item(s).`,
          data: processedResults,
          combinedSpeech: {
            text: allSummariesText,
            audioPath: combinedAudioPath,
          },
        });
      } catch (finalErr) {
        console.error(
          '❌ Error generating final combined audio:',
          finalErr.message
        );
        return res.json({
          message: `Processed ${processedResults.length} news item(s). Combined speech failed.`,
          data: processedResults,
          combinedSpeech: null,
        });
      }
    } else {
      return res.json({
        message: 'No valid summaries could be generated.',
        data: processedResults,
        combinedSpeech: null,
      });
    }
  } catch (error) {
    console.error('🔥 Server error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = { processNews };
