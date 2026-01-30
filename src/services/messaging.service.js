// src/services/messaging.service.js
"use strict";

/**
 * Intenta reaccionar a un mensaje, ignorando errores si falla.
 * @param {import('whatsapp-web.js').Message} message El objeto del mensaje.
 * @param {string} reaction El emoji para reaccionar.
 */
async function tryReact(message, reaction) {
    try {
        await message.react(reaction);
    } catch (error) {
        // Ignora el error de reacción, pero lo registra como advertencia.
        console.warn(`(MessagingService) -> No se pudo reaccionar con ${reaction}: ${error.message}`);
    }
}

/**
 * Maneja el ciclo de vida de las reacciones para un comando.
 * @param {import('whatsapp-web.js').Message} message El objeto del mensaje.
 * @param {Promise<any>} commandPromise La promesa que representa la ejecución del comando.
 */
async function handleReaction(message, commandPromise) {
    // UX: Solo mostramos el reloj si la operación tarda más de 500ms
    // Esto evita el "parpadeo" de reacciones en comandos instantáneos (como !menu)
    const loadingTimeout = setTimeout(() => tryReact(message, '⏳'), 500);

    try {
        await commandPromise;
        clearTimeout(loadingTimeout); // Cancelamos el reloj si terminó rápido
        await tryReact(message, '✅');
    } catch (error) {
        clearTimeout(loadingTimeout);
        await tryReact(message, '❌');
        // El error se relanza para que el manejador principal lo capture y envíe el mensaje de error.
        throw error;
    }
}

module.exports = { handleReaction, tryReact };