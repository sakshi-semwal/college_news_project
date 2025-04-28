const fs = require('fs');
const path = require('path');
const moment = require('moment');
const PdfPrinter = require('pdfmake');
const News = require('../models/News');
const axios = require('axios');

// ✅ Use Courier as the default font (built-in, no need to download)
const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const printer = new PdfPrinter(fonts);

// Helper to convert image URL to base64
async function getImageAsBase64(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 5000, // optional timeout
    });

    const contentType = response.headers['content-type'];
    const supportedFormats = ['image/jpeg', 'image/png', 'image/jpg'];

    if (!supportedFormats.includes(contentType)) {
      console.warn(`⚠️ Unsupported image format: ${contentType}`);
      return null;
    }

    const imageBuffer = Buffer.from(response.data, 'binary').toString('base64');
    return `data:${contentType};base64,${imageBuffer}`;
  } catch (error) {
    console.warn(`⚠️ Could not fetch image at ${url}: ${error.message}`);
    return null;
  }
}

function groupArticlesIntoColumns(articles, columnsPerRow = 2) {
  const rows = [];

  for (let i = 0; i < articles.length; i += columnsPerRow) {
    const rowItems = articles.slice(i, i + columnsPerRow).map((block) => ({
      stack: block,
      margin: [5, 0],
    }));

    // Ensure the columns property is correctly populated
    rows.push({
      columns: rowItems.length > 0 ? rowItems : [], // If rowItems is empty, we avoid adding undefined columns
      columnGap: 15,
      margin: [0, 10],
    });
  }

  return rows;
}

async function generateNewspaperPDF() {
  console.log('🔄 Fetching news from database...');
  const newsList = await News.find().limit(100);
  console.log(`✅ ${newsList.length} news articles fetched.`);

  const articlesPerPage = 4;
  const maxPages = 13;
  const maxArticles = articlesPerPage * maxPages;

  const slicedNews = newsList.slice(0, maxArticles);
  const content = [];

  for (let i = 0; i < slicedNews.length; i++) {
    const news = slicedNews[i];
    const date = moment(news.rawData?.pubDate).format('LL');

    const newsBlock = [
      { text: news.title, style: 'header' },
      {
        text: `🖋️ ${news.rawData?.creator?.[0] || 'Unknown'} | 🗓️ ${date}`,
        style: 'meta',
      },
    ];

    if (news.rawData?.image_url) {
      console.log(`📸 Fetching image for article #${i + 1}`);
      const base64Image = await getImageAsBase64(news.rawData.image_url);
      if (base64Image) {
        newsBlock.push({
          image: base64Image,
          width: 400,
          alignment: 'center',
          margin: [0, 10, 0, 10],
        });
      }
    }

    newsBlock.push({ text: news.content, style: 'bodyText' });
    content.push(newsBlock); // Just push the array of blocks

    content.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }],
    });

    console.log(`📰 Added article #${i + 1}`);
  }

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [30, 40, 30, 60],
    defaultStyle: {
      font: 'Helvetica',
    },
    content: [
      {
        text: '📰 Today’s News',
        fontSize: 22,
        alignment: 'center',
        bold: true,
        margin: [0, 0, 0, 20],
      },
      ...groupArticlesIntoColumns(content, 2), // 2-column layout
    ],

    styles: {
      header: {
        fontSize: 16,
        bold: true,
        margin: [0, 5, 0, 5],
      },
      meta: {
        fontSize: 9,
        italics: true,
        color: 'gray',
        margin: [0, 0, 0, 5],
      },
      bodyText: {
        fontSize: 11,
        lineHeight: 1.3,
        alignment: 'justify',
      },
    },
  };

  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
    console.log('📁 Created public directory.');
  }

  const filePath = path.join(publicDir, `Newspaper_${Date.now()}.pdf`);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const writeStream = fs.createWriteStream(filePath);

  console.log('🖨️ Generating PDF...');
  pdfDoc.pipe(writeStream);
  pdfDoc.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log(`✅ PDF created at: ${filePath}`);
      resolve(filePath);
    });
    writeStream.on('error', (err) => {
      console.error('❌ Error writing PDF:', err.message);
      reject(err);
    });
  });
}

module.exports = { generateNewspaperPDF };
