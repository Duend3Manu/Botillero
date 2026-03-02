"use strict";

const funHandler = require('./fun.handler');

/**
 * Maneja mensajes que no son comandos pero que contienen palabras clave.
 * @param {object} message - El objeto de mensaje adaptado.
 */
async function keywordHandler(message) {
    const lowerCaseBody = (message.text || '').toLowerCase();

    if (lowerCaseBody.includes('bot')) {
        await funHandler.handleBotMention(message);
    } else if (lowerCaseBody.includes('once')) {
        await funHandler.handleOnce(message);
    }
    // Puedes añadir más palabras clave aquí con 'else if'
}

module.exports = keywordHandler;