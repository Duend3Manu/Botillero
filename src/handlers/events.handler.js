// src/handlers/events.handler.js (VERSIÓN WHATSAPP)
"use strict";

const { storeMessage, getOriginalMessage } = require('../utils/db.js');

/**
 * handleMessageCreate — Guarda el mensaje en DB para registrar historial
 * Esto permite detectar ediciones e intent de borrado si el bot lo soporta.
 */
async function handleMessageCreate(client, message) {
    if (!message.fromMe && message.body) {
        const msgKey = message.id._serialized;
        storeMessage(msgKey, message.body);
    }
}

/**
 * handleMessageUpdate — Se activa cuando un usuario edita su mensaje
 */
async function handleMessageUpdate(client, message) {
    if (!message || !message.body) return;

    const msgKey = message.id._serialized;
    const originalBody = await getOriginalMessage(msgKey);

    if (originalBody && originalBody !== message.body) {
        const chat = await message.getChat();
        const contact = await message.getContact();
        const senderName = contact.pushname || contact.name || contact.number || "Usuario";

        const notifyMessage = `✏️ *${senderName}* editó un mensaje.\n\n*Original:* "${originalBody}"\n*Editado:* "${message.body}"`;

        try {
            await client.sendMessage(message.from, notifyMessage);
            // Actualizar en DB
            storeMessage(msgKey, message.body);
        } catch (err) {
            console.warn('(EventsHandler) -> Error al notificar edición:', err.message);
        }
    }
}

/**
 * handleMessageRevoke — Se activa cuando alguien elimina un mensaje para todos
 */
async function handleMessageRevoke(client, after, before) {
    if (!before) return; // No tenemos el mensaje original en cache del wwebjs

    const msgKey = before.id._serialized;
    const originalBody = await getOriginalMessage(msgKey);

    if (originalBody) {
        const chat = await before.getChat();
        const contact = await before.getContact();
        const senderName = contact.pushname || contact.name || contact.number || "Usuario";

        const notifyMessage = `🗑️ *${senderName}* eliminó un mensaje.\n\n*Contenido:* "${originalBody}"`;

        try {
            await client.sendMessage(before.from, notifyMessage);
        } catch (err) {
            console.warn('(EventsHandler) -> Error al notificar eliminación:', err.message);
        }
    }
}

module.exports = {
    handleMessageCreate,
    handleMessageUpdate,
    handleMessageRevoke
};