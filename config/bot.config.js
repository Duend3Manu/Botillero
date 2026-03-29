// config/bot.config.js
const fs = require('fs');
const path = require('path');

/**
 * Configuración para el Botillero (WhatsApp Only)
 * Selecciona el archivo JSON según BOT_ENV o presencia de botillero_xiaomi.json
 */

const botEnv = process.env.BOT_ENV || (fs.existsSync(path.join(__dirname, 'botillero_xiaomi.json')) ? 'xiaomi' : 'default');
const configFileName = botEnv === 'xiaomi' ? 'botillero_xiaomi.json' : 'botillero.json';
const configFilePath = path.join(__dirname, configFileName);

let baseConfig = {
    botName: "Botillero",
    clientId: "botillero-session",
    disabledFeatures: []
};

if (fs.existsSync(configFilePath)) {
    try {
        const fileContent = fs.readFileSync(configFilePath, 'utf8');
        baseConfig = { ...baseConfig, ...JSON.parse(fileContent) };
    } catch (e) {
        console.error(`❌ Error cargando ${configFileName}:`, e.message);
    }
}

module.exports = {
    ...baseConfig,
    authStrategy: {
        clientId: baseConfig.clientId,
        dataPath: './.wwebjs_auth'
    },
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-extensions',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    },
    rateLimiting: {
        globalCooldownMs: 2000,
        maxWarningsPerUser: 5,
        cleanupIntervalMs: 300000
    }
};
