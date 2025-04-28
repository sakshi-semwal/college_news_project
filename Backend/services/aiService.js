const axios = require('axios');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs').promises;
require('dotenv').config();
const MODEL_NAME = 'models/gemini-1.5-flash-latest';
async function summarizeNews(content) {
  try {
    console.log('Starting news summarization...');

    if (!process.env.GEMINI_API_KEY) throw new Error('Missing Gemini API key');
    console.log('Gemini API Key Found.');

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `Summarize the following news article in a concise manner. The article can be in any language. Preserve the original language in the summary. If the article is in Hindi, summarize in Hindi. If it’s in English, summarize in English. Same goes for other languages:`,
              },
              { text: content },
            ],
          },
        ],
      }
    );

    console.log('Response received from Gemini API:', response.data);

    const summary =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No summary available.';
    console.log('Generated summary:', summary);

    return summary;
  } catch (error) {
    console.error('Error summarizing news:', error.message);

    if (error.response) {
      console.error('Full Gemini API Error:', error.response.data);
    }

    throw new Error('Summary generation failed');
  }
}

// Generate a structured transcript using Gemini
async function generateTranscript(content) {
  try {
    console.log('Starting transcript generation...');

    if (!process.env.GEMINI_API_KEY) throw new Error('Missing Gemini API key');
    console.log('Gemini API Key Found.');

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: 'Convert the following news article into a structured transcript:',
              },
              { text: content },
            ],
          },
        ],
      }
    );

    console.log('Response received from Gemini API:', response.data);

    const transcript =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No transcript available.';
    console.log('Generated transcript:', transcript);

    return transcript;
  } catch (error) {
    console.error('Error generating transcript:', error.message);

    if (error.response) {
      console.error('Full Gemini API Error:', error.response.data);
    }

    return 'Error generating transcript.';
  }
}

async function convertTextToSpeech(text, fileName, accent = 'hi-IN') {
  try {
    console.log('🎤 Starting text-to-speech conversion...');
    console.log('🔹 Text:', text);
    console.log('🔹 File Name:', fileName);
    console.log('🔹 Selected Accent:', accent);

    const client = new textToSpeech.TextToSpeechClient();
    console.log('✅ Google TTS client initialized.');

    // 🔹 Select voice based on accent
    const voices = {
      'en-US': 'en-US-Neural2-D', // 🇺🇸 American English
      'en-GB': 'en-GB-Neural2-D', // 🇬🇧 British English
      'en-AU': 'en-AU-Neural2-D', // 🇦🇺 Australian English
      'en-IN': 'en-IN-Neural2-D', // 🇮🇳 Indian English
      'hi-IN': 'hi-IN-Neural2-D', // 🇮🇳 Hindi
    };

    const request = {
      input: {
        ssml: `<speak>
                  <break time="500ms"/>
                  ${text}
                  <break time="500ms"/>
               </speak>`,
      },
      voice: {
        languageCode: accent,
        name: voices[accent] || voices['hi-IN'], // Default to Hindi if accent is invalid
        ssmlGender: 'FEMALE',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
      },
    };

    console.log('📤 Sending request to Google TTS API...');
    const [response] = await client.synthesizeSpeech(request);
    console.log('✅ Received response from Google TTS API.');

    const filePath = `./public/audio/${fileName}.mp3`;
    console.log('💾 Saving audio file to:', filePath);

    await fs.writeFile(filePath, response.audioContent, 'binary');
    console.log('✅ File saved successfully.');

    return filePath;
  } catch (error) {
    console.error('❌ Error converting text to speech:', error.message);
    return 'Error generating audio.';
  }
}

// convertTextToSpeech('नमस्ते! आप कैसे हैं?', 'hindi_greeting', 'hi-IN'); // 🇮🇳 Hindi Voice

module.exports = { summarizeNews, generateTranscript, convertTextToSpeech };
