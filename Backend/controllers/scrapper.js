const axios = require('axios');
const cheerio = require('cheerio');

async function getFullNews(url) {
  try {
    console.log('Fetching news from:', url);
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, // Prevent request blocking
    });

    const $ = cheerio.load(data);

    // Extract title
    const title = $('h1').text().trim() || $('title').text().trim();

    // Extract date (modify selector if needed)
    const date = $('time').text().trim() || $('.date-class').text().trim(); // Check the site for the correct class

    // Extract main content - Modify selector based on site structure
    let content = $('article, .news-content, .entry-content, .post-content')
      .text()
      .trim();

    // Remove extra spaces and unnecessary text
    content = content.replace(/\s\s+/g, ' '); // Replace multiple spaces with single space

    console.log('\n📰 Title:', title);
    console.log('📅 Date:', date || 'Not Found');
    console.log('\n📜 Content Preview:', content.substring(0, 500) + '...'); // Show first 500 chars

    return { title, date, content };
  } catch (error) {
    console.error('Error fetching full news:', error.message);
    return null;
  }
}

// Test the function with your news link
// getFullNews(
//   'https://www.bhaskar.com/local/rajasthan/jaipur/news/celebration-of-return-of-nasa-astronaut-sunita-williams-134671596.html'
// ).then((result) => console.log('\n✅ Final Extracted News:', result));
async function getPublicIP() {
  try {
    const { data } = await axios.get('https://api64.ipify.org?format=json');
    return data.ip; // Return the IP correctly
  } catch (error) {
    console.error('Error fetching public IP:', error);
  }
}

async function getLocationFromIP(ip) {
  try {
    const { data } = await axios.get(`http://ip-api.com/json/${ip}`);
    console.log('User Location:', data.country, data.region, data.regionName, data.city);
  } catch (error) {
    console.error('Error fetching location:', error);
  }
}

// ✅ Correct way to call both functions
async function fetchIPAndLocation() {
  try {
    const ip = await getPublicIP(); // Wait for the IP to be retrieved
    console.log('User Public IP:', ip);
    if (ip) {
      await getLocationFromIP(ip); // Fetch location based on IP
    }
  } catch (error) {
    console.error('Error in fetching IP and location:', error);
  }
}

// Run the function
fetchIPAndLocation();
