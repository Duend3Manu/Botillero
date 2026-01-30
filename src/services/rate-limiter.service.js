/**
 * Servicio de Control de Velocidad (Rate Limiter)
 * Mantiene un cooldown global para todas las peticiones a Gemini
 * Objetivo: Respetar los límites gratuitos de Google Gemini API
 */
"use strict";

const AI_COOLDOWN_SECONDS = 10; // Subimos a 10s para ser más seguros con la cuota gratuita
let lastAiRequestTimestamp = 0;

/**
 * Intenta adquirir permiso para usar la IA.
 * Si tiene éxito, actualiza el timestamp INMEDIATAMENTE (evita condiciones de carrera).
 * @returns {Object} { success: boolean, timeLeft: number }
 */
function tryAcquire() {
    const now = Date.now();
    const timeSinceLastRequest = (now - lastAiRequestTimestamp) / 1000;

    if (timeSinceLastRequest < AI_COOLDOWN_SECONDS) {
        const timeLeft = Math.ceil(AI_COOLDOWN_SECONDS - timeSinceLastRequest);
        return { success: false, timeLeft };
    }

    lastAiRequestTimestamp = now; // 🔒 Bloqueo inmediato
    return { success: true, timeLeft: 0 };
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
    tryAcquire,
    getCooldownMessage,
    AI_COOLDOWN_SECONDS
};
