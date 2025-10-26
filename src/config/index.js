// src/config/index.js
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const config = {
  port: process.env.PORT || 3000,
  weatherApiKey: process.env.WEATHER_API_KEY,
};

module.exports = config;