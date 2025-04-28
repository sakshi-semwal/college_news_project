const News = require('../models/News');
const CombinedSpeech = require('../models/CombinedSpeech');
const {
  summarizeNews,
  generateTranscript,
  convertTextToSpeech,
} = require('../services/aiService');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

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

function splitTextByBytes(text, maxBytes = 4800) {
  const chunks = [];
  let current = '';
  for (const sentence of text.split('. ')) {
    const test = current + sentence + '. ';
    if (Buffer.byteLength(test, 'utf-8') > maxBytes) {
      chunks.push(current.trim());
      current = sentence + '. ';
    } else {
      current = test;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

// Helper to merge audio files
function mergeAudioFiles(
  audioPaths,
  outputFileName = `combined_${Date.now()}.mp3`
) {
  return new Promise((resolve, reject) => {
    const fileListPath = path.join(__dirname, `fileList_${Date.now()}.txt`);
    const listContent = audioPaths
      .map(
        (p) =>
          `file '${path.join(
            __dirname,
            '..',
            'public',
            'audio',
            path.basename(p)
          )}'`
      )
      .join('\n');

    fs.writeFileSync(fileListPath, listContent);

    const outputFilePath = path.join(
      __dirname,
      '..',
      'public',
      'audio',
      outputFileName
    );

    ffmpeg()
      .input(fileListPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .output(outputFilePath)
      .on('end', () => {
        fs.unlinkSync(fileListPath); // clean up
        resolve(outputFilePath);
      })
      .on('error', (err) => {
        console.error('FFmpeg merge error:', err.message);
        reject(err);
      })
      .run();
  });
}

async function generateCombinedSpeech(req, res) {
  try {
    const newsList = await News.find();

    if (!newsList.length) {
      return res.status(404).json({ message: 'No news found in database.' });
    }

    const bulletSummaries = [];
    const plainSummaries = [];

    for (const news of newsList) {
      try {
        const summary = await summarizeNews(news.content);
        bulletSummaries.push(`• ${summary}`);
        plainSummaries.push(summary);
      } catch (err) {
        console.error(
          `❌ Error summarizing news "${news.title}":`,
          err.message
        );
        continue;
      }
    }

    if (bulletSummaries.length === 0) {
      return res.status(400).json({ message: 'No summaries generated.' });
    }

    const transcript = `Here is a complete summary of today's news:\n${bulletSummaries.join(
      '\n'
    )}`;

    // Generate a smaller final summary from all summaries
    const combinedSummary = await summarizeNews(plainSummaries.join(' '));

    const textChunks = splitTextByBytes(transcript);
    const audioPaths = [];

    for (let i = 0; i < textChunks.length; i++) {
      try {
        const fileName = `chunk_${Date.now()}_${i}`;
        const audioPath = await convertTextToSpeech(textChunks[i], fileName);
        audioPaths.push(audioPath);
      } catch (err) {
        console.error(
          `❌ Error converting chunk ${i + 1} to audio:`,
          err.message
        );
        continue;
      }
    }

    if (audioPaths.length === 0) {
      return res.status(500).json({ message: 'All TTS conversions failed.' });
    }

    const finalOutputPath = path.join(
      __dirname,
      '..',
      'public',
      `combined_news_${Date.now()}.mp3`
    );

    await mergeAudioFiles(audioPaths, finalOutputPath);

    const savedSpeech = await CombinedSpeech.create({
      category: 'all',
      transcript,
      summary: combinedSummary,
      audioPath: `combined_news_${Date.now()}.mp3`,
    });

    return res.json({
      message: '✅ Combined speech generated successfully.',
      combinedSpeech: {
        transcript,
        summary: combinedSummary,
        audioPath: savedSpeech.audioPath,
        dbId: savedSpeech._id,
      },
    });
  } catch (error) {
    console.error('🔥 Server error:', error.message);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

async function mergeAudioChunksFromFolder(req, res) {
  const audioDir = path.join(__dirname, '..', 'public', 'audio');
  const outputFileName = `merged_${Date.now()}.mp3`;
  const outputPath = path.join(audioDir, outputFileName);

  try {
    const files = fs
      .readdirSync(audioDir)
      .filter((file) => file.endsWith('.mp3') && file.startsWith('chunk_'))
      .sort();

    if (files.length < 2) {
      return res.status(400).json({ message: 'Not enough chunks to merge.' });
    }

    // 🧠 Step 1: Fetch news and generate transcript and summary
    const newsList = await News.find();
    if (!newsList.length) {
      return res.status(404).json({ message: 'No news data found.' });
    }

    const summaries = [];
    const transcriptLines = [];

    for (const news of newsList) {
      try {
        const summary = await summarizeNews(news.content);
        summaries.push(`• ${summary}`);
        transcriptLines.push(`• ${news.content}`);
      } catch (err) {
        console.error(`Error summarizing "${news.title}":`, err.message);
        continue;
      }
    }

    const transcript = transcriptLines.join('\n');
    const summary = summaries.join('\n');

    // 📝 Step 2: Create ffmpeg list file
    const fileListPath = path.join(__dirname, `fileList_${Date.now()}.txt`);
    const listContent = files
      .map((file) => `file '${path.join(audioDir, file).replace(/\\/g, '/')}'`)
      .join('\n');

    fs.writeFileSync(fileListPath, listContent);

    // 🎵 Step 3: Merge and save to DB
    ffmpeg()
      .input(fileListPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .output(outputPath)
      .on('end', async () => {
        fs.unlinkSync(fileListPath);

        try {
          const newCombined = new CombinedSpeech({
            category: 'all',
            transcript,
            summary,
            audioPath: `audio/${outputFileName}`,
          });

          const saved = await newCombined.save();

               return res.json({
        message: '✅ Audio chunks merged and saved successfully.',
        combinedSpeech: {
          transcript,
          summary,
          audioPath: newCombined.audioPath,
          dbId: saved._id,
        },
      });
    } catch (dbError) {
      console.error('❌ Failed to save combined audio to database:', dbError.message);
      return res.status(500).json({ message: 'Audio merged but failed to save to database.' });
    }
  })
  .on('error', (err) => {
    console.error('❌ FFmpeg merge error:', err.message);
    return res.status(500).json({ message: 'Failed to merge audio chunks.' });
  })
  .run();

  } catch (err) {
    console.error('Error:', err.message);
    return res
      .status(500)
      .json({ message: 'Internal server error', error: err.message });
  }
}

module.exports = {
  processNews,
  generateCombinedSpeech,
  mergeAudioChunksFromFolder,
};
