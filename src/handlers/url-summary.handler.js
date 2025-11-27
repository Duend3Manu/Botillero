/**
 * Handler para detectar y resumir URLs compartidas en el grupo
 * Respeta cooldown de 7 segundos para mantener API gratis
 */
"use strict";

const { summarizeUrl } = require('../services/url-summarizer.service');
const rateLimiter = require('../services/rate-limiter.service');

/**
 * Detecta URLs en un mensaje y resume la primera que encuentre
 * @param {Object} message - El objeto de mensaje
 * @returns {Promise<string|null>} Resumen formateado o null si no hay URLs
 */
async function handleUrlSummary(message) {
    // Expresión regular para detectar URLs
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = message.body.match(urlRegex);

    if (!matches || matches.length === 0) {
        return null; // No hay URLs en el mensaje
    }

    // Verificar cooldown antes de hacer la petición a IA
    const cooldown = rateLimiter.checkCooldown();
    if (!cooldown.canMakeRequest) {
        await message.react('⏳');
        return rateLimiter.getCooldownMessage(cooldown.timeLeft);
    }

    try {
        await message.react('⏳');
        
        // Resumir la primera URL encontrada
        const url = matches[0];
        console.log(`(URL Summary) -> Resumiendo: ${url}`);
        
        const summary = await summarizeUrl(url);
        
        // Actualizar timestamp de la petición exitosa
        rateLimiter.updateLastRequest();
        await message.react('✅');
        
        return summary;
    } catch (error) {
        console.error('(URL Summary) -> Error:', error.message);
        await message.react('❌');
        return `❌ No pude resumir esa URL: ${error.message}`;
    }
}

module.exports = {
    handleUrlSummary
};
