// src/config/index.js
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

// --- Validación de Variables de Entorno ---
const requiredEnvVars = {
  'GEMINI_API_KEY': 'Servicio de IA (comando !ayuda)',
  'WEATHER_API_KEY': 'Información del clima (comando !clima)'
};

const missingVars = [];
for (const [varName, description] of Object.entries(requiredEnvVars)) {
  if (!process.env[varName]) {
    missingVars.push(`  ❌ ${varName} - Necesario para: ${description}`);
  }
}

if (missingVars.length > 0) {
  console.warn('⚠️  ADVERTENCIA: Variables de entorno faltantes:');
  console.warn(missingVars.join('\n'));
  console.warn('⚠️  Algunos comandos pueden no funcionar correctamente.\n');
}

const config = {
  port: process.env.PORT || 3000,
  weatherApiKey: process.env.WEATHER_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  notificationPort: process.env.NOTIFICATION_PORT || 3001,
  notificationGroupId: process.env.NOTIFICATION_GROUP_ID
};

module.exports = config;