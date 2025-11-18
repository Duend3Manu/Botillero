// src/handlers/ai.handler.js
"use strict";

// --- ¡NUEVO! Importamos el servicio de IA ---
const { findCommandWithAI } = require('../services/ai.service');

// --- ¡NUEVO! Cooldown para la IA ---
let lastAiRequestTimestamp = 0;
const AI_COOLDOWN_SECONDS = 7; // 7 segundos de espera

async function handleAiHelp(message) {
    const userQuery = message.body.substring(message.body.indexOf(' ') + 1).toLowerCase().trim();

    if (!userQuery || userQuery === 'ayuda' || userQuery === 'help') {
        return "¡Wena compa! Soy Botillero. Dime qué necesitas hacer y te ayudaré a encontrar el comando correcto. 🤖\n\nPor ejemplo: `!ayuda quiero saber el clima en valparaíso`";
    }

    // --- ¡NUEVO! Verificación del cooldown ---
    const now = Date.now();
    const timeSinceLastRequest = (now - lastAiRequestTimestamp) / 1000;

    if (timeSinceLastRequest < AI_COOLDOWN_SECONDS) {
        const timeLeft = Math.ceil(AI_COOLDOWN_SECONDS - timeSinceLastRequest);
        return `⏳ Calma las pasiones, espera ${timeLeft} segundos antes de volver a intentarlo.`;
    }

    try {
        // Llamamos a la IA para que nos dé la respuesta
        const aiResponse = await findCommandWithAI(userQuery);
        lastAiRequestTimestamp = Date.now(); // Actualizamos el timestamp solo si la llamada fue exitosa
        return aiResponse;
    } catch (error) {
        console.error("Error al contactar la IA de Google:", error);
        return "Tuve un problema para conectarme con la IA, compa. Intenta de nuevo más tarde.";
    }
}

module.exports = {
    handleAiHelp
};