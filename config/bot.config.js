// config/bot.config.js
"use strict";

/**
 * Configuración del Bot de Telegram (Botillero v2.0)
 * Reemplaza la configuración de Puppeteer/WhatsApp Web.
 */

module.exports = {
    // Configuración de polling de Telegram
    // Se usa en telegram.js al crear la instancia de TelegramBot
    polling: {
        interval: 300,       // ms entre peticiones al API de Telegram
        autoStart: true,
        params: {
            timeout: 10      // long-polling timeout en segundos
        }
    },

    // Configuración de rate limiting
    // globalCooldownMs: 0 = sin límite (máxima velocidad)
    rateLimiting: {
        globalCooldownMs: 0,         // Sin límite — procesa comandos instantáneamente
        cleanupIntervalMs: 300000,   // Limpiar cache cada 5 minutos
        maxWarningsPerUser: 3        // Máximo de advertencias antes de ignorar silenciosamente
    }
};
