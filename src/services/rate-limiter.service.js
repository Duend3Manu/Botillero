/**
 * Servicio de Control de Velocidad (Rate Limiter)
 * Mantiene un cooldown global para todas las peticiones a Gemini
 * Objetivo: Respetar los límites gratuitos de Google Gemini API
 */
"use strict";

const AI_COOLDOWN_SECONDS = 7; // 7 segundos entre peticiones a IA
let lastAiRequestTimestamp = 0;

/**
 * Verifica si hay que esperar antes de hacer una petición a IA
 * @returns {Object} { canMakeRequest: boolean, timeLeft: number }
 */
function checkCooldown() {
    const now = Date.now();
    const timeSinceLastRequest = (now - lastAiRequestTimestamp) / 1000;

    if (timeSinceLastRequest < AI_COOLDOWN_SECONDS) {
        const timeLeft = Math.ceil(AI_COOLDOWN_SECONDS - timeSinceLastRequest);
        return { canMakeRequest: false, timeLeft };
    }

    return { canMakeRequest: true, timeLeft: 0 };
}

/**
 * Actualiza el timestamp de la última petición exitosa a IA
 */
function updateLastRequest() {
    lastAiRequestTimestamp = Date.now();
}

/**
 * Retorna un mensaje de espera formateado
 * @param {number} timeLeft - Segundos restantes
 * @returns {string}
 */
function getCooldownMessage(timeLeft) {
    return `⏳ Calma las pasiones, espera ${timeLeft} segundo${timeLeft > 1 ? 's' : ''} antes de volver a intentarlo.`;
}

module.exports = {
    checkCooldown,
    updateLastRequest,
    getCooldownMessage,
    AI_COOLDOWN_SECONDS
};
