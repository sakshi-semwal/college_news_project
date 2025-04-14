const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const newsRoutes = require('./routes/newsRoutes'); // ✅ Import news routes

dotenv.config();
connectDB();
console.log(
  'Google Credentials Path:',
  process.env.GOOGLE_APPLICATION_CREDENTIALS
);

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));

app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes); // ✅ Add news processing routes

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
