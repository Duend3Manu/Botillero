// src/handlers/events.handler.js
"use strict";

const { storeMessage, getOriginalMessage } = require('../utils/db.js');

/**
 * handleMessageCreate — Adaptado para Telegram.
 * Se activa cuando se recibe un mensaje en Telegram.
 * Guarda el texto en DB para poder compararlo si se edita.
 * 
 * Nota: en Telegram los mensajes tienen msg.message_id (número), no un string serializado.
 * Usamos chatId + ":" + message_id como clave única.
 */
async function handleMessageCreate(client, message) {
    if (!message.fromMe && message._raw) {
        const rawMsg = message._raw;
        const msgKey = `${rawMsg.chat.id}:${rawMsg.message_id}`;

        // Guardamos el texto del mensaje para detectar ediciones
        if (rawMsg.text) {
            storeMessage(msgKey, rawMsg.text);
        }

        // Nota: en Telegram el evento 'message' también entrega fotos, documentos, audio, etc.
        // La caché de media para stickers (addToMediaCache) no se usa en Telegram
        // porque los stickers se manejan directamente vía sendSticker en la Bot API.
    }
}

/**
 * handleMessageUpdate — Adaptado para Telegram.
 * Telegram emite el evento 'edited_message' cuando un usuario edita un mensaje.
 * 
 * @param {TelegramBot} bot - Instancia del bot
 * @param {Object} editedMsg - Objeto edited_message de Telegram
 */
async function handleMessageUpdate(bot, editedMsg) {
    if (!editedMsg || !editedMsg.text) return;

    const msgKey = `${editedMsg.chat.id}:${editedMsg.message_id}`;
    const originalBody = await getOriginalMessage(msgKey);

    if (originalBody && originalBody !== editedMsg.text) {
        const senderName = editedMsg.from.username
            ? `@${editedMsg.from.username}`
            : `${editedMsg.from.first_name || 'Usuario'}`;

        const notifyMessage = `✏️ ${senderName} editó un mensaje.\n\n*Original:* "${originalBody}"\n*Editado:* "${editedMsg.text}"`;

        try {
            await bot.sendMessage(editedMsg.chat.id, notifyMessage, { parse_mode: 'Markdown' });
            // Actualizar en DB con el nuevo texto
            storeMessage(msgKey, editedMsg.text);
        } catch (err) {
            console.warn('(EventsHandler) -> No se pudo notificar edición:', err.message);
        }
    }
}

/**
 * handleMessageRevoke — SIN EQUIVALENTE EN TELEGRAM.
 * 
 * En WhatsApp, cuando un usuario elimina un mensaje para todos, el bot recibe
 * el evento 'message_revoke_everyone'. En Telegram, la Bot API NO notifica al bot
 * cuando un usuario elimina un mensaje (la eliminación es silenciosa para los bots).
 * 
 * Esta función se deja como stub comentado para documentar la limitación.
 * 
 * Alternativa parcial: si el bot tiene permisos de administrador en un grupo,
 * podría detectar la ausencia de mensajes via getHistory, pero esto requiere
 * polling activo y no es equivalente al evento push de WhatsApp.
 */
async function handleMessageRevoke(client, after, before) {
    // ⚠️  Sin equivalente en Telegram Bot API.
    // Telegram no notifica a los bots cuando un mensaje es eliminado.
    // Se requeriría MTProto (Telegram Client API) en lugar de Bot API para esta funcionalidad.
    console.log('(EventsHandler) -> handleMessageRevoke: no implementado en Telegram Bot API.');
}

module.exports = {
    handleMessageCreate,
    handleMessageUpdate,
    handleMessageRevoke
};