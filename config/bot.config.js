// config/bot.config.js
"use strict";

/**
 * Configuración del Bot de WhatsApp
 * Centraliza toda la configuración de Puppeteer y autenticación
 */

module.exports = {
    authStrategy: {
        clientId: "botillero-prod",
        dataPath: "./.wwebjs_auth"
    },
    
    puppeteer: {
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        
        args: [
            // Seguridad
            '--no-sandbox',
            '--disable-setuid-sandbox',
            
            // Optimización de memoria
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            
            // Reducción de overhead
            '--no-first-run',
            '--no-zygote',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            
            // Performance
            '--metrics-recording-only',
            '--mute-audio',
            '--no-default-browser-check',
            '--disable-breakpad'
        ],
        
        headless: true,
        ignoreHTTPSErrors: true
    },
    
    // Configuración de rate limiting (DESACTIVADO para máxima velocidad)
    rateLimiting: {
        globalCooldownMs: 0, // Sin límite - procesa comandos instantáneamente
        cleanupIntervalMs: 300000, // Limpiar cache cada 5 minutos
        maxWarningsPerUser: 3 // Máximo de advertencias antes de ignorar silenciosamente
    }
};
