// src/handlers/ai.handler.js
"use strict";

// --- Importamos servicios ---
const { findCommandWithAI } = require('../services/ai.service');
const rateLimiter = require('../services/rate-limiter.service');

async function handleAiHelp(message) {
    const userQuery = message.body.substring(message.body.indexOf(' ') + 1).toLowerCase().trim();

    if (!userQuery || userQuery === 'ayuda' || userQuery === 'help') {
        return "¡Wena compa! Soy Botillero. Dime qué necesitas hacer y te ayudaré a encontrar el comando correcto. 🤖\n\nPor ejemplo: `!ayuda quiero saber el clima en valparaíso`";
    }

    // Verificación del cooldown global
    const cooldown = rateLimiter.checkCooldown();
    if (!cooldown.canMakeRequest) {
        return rateLimiter.getCooldownMessage(cooldown.timeLeft);
    }

    try {
        // Llamamos a la IA para que nos dé la respuesta
        const aiResponse = await findCommandWithAI(userQuery);
        rateLimiter.updateLastRequest(); // Actualizamos el timestamp solo si la llamada fue exitosa
        return aiResponse;
    } catch (error) {
        console.error("Error al contactar la IA de Google:", error);
        return "Tuve un problema para conectarme con la IA, compa. Intenta de nuevo más tarde.";
    }
}

module.exports = {
    handleAiHelp
};