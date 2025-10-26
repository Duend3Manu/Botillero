// src/utils/reaction.util.js
"use strict";

const DEBUG_MODE = process.env.DEBUG_REACTIONS === 'true';

/**
 * Intenta reaccionar a un mensaje de forma segura, sin detener la ejecución.
 * @param {Message} message El objeto del mensaje al que se reaccionará.
 * @param {string} emoji El emoji con el que se reaccionará.
 */
async function safeReact(message, emoji) {
    try {
        await message.react(emoji);
    } catch (e) {
        console.warn(`(Advertencia) No se pudo reaccionar con ${emoji}.`);
        if (DEBUG_MODE) {
            console.error("Error detallado de reacción:", e);
        }
    }
}

module.exports = { safeReact };