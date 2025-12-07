// src/handlers/events.handler.js
"use strict";

const commandHandler = require('./command.handler');
const { storeMessage, getOriginalMessage } = require('../utils/db.js');
// const { handleUrlSummary } = require('./url-summary.handler'); // ELIMINADO

// Se activa cuando un usuario crea un mensaje
async function handleMessageCreate(client, message) {
    if (!message.fromMe) {
        // Guardamos una copia de cada mensaje para poder compararlo si se edita
        storeMessage(message.id._serialized, message.body);
        
// Detectar y resumir URLs automáticamente (ELIMINADO POR SOLICITUD DEL USUARIO)
        /*
        try {
            const summary = await handleUrlSummary(message);
            if (summary) {
                await message.reply(summary);
            }
        } catch (error) {
            console.error('(Events) -> Error al intentar resumir URL:', error.message);
            // No interrumpir el flujo normal si hay error en URL summary
        }
        */
    }
}

// Se activa cuando un usuario edita un mensaje
async function handleMessageUpdate(client, message) {
    if (!message.fromMe) {
        const originalBody = await getOriginalMessage(message.id._serialized);
        if (originalBody && originalBody !== message.body) {
            const chat = await message.getChat();
            const sender = await message.getContact();
            const notifyMessage = `El usuario @${sender.id.user} editó un mensaje.\n\n*Original:* "${originalBody}"\n*Editado:* "${message.body}"`;
            
            await client.sendMessage(chat.id._serialized, notifyMessage, { mentions: [sender] });
            // Actualizamos el mensaje en nuestra base de datos
            storeMessage(message.id._serialized, message.body);
        }
    }
}

// Se activa cuando un usuario elimina un mensaje para todos
async function handleMessageRevoke(client, after, before) {
    if (before && !before.fromMe) {
        const chat = await before.getChat();
        const sender = await before.getContact();
        const message = `El usuario @${sender.id.user} eliminó este mensaje:\n\n_"${before.body}"_`;

        await client.sendMessage(chat.id._serialized, message, { mentions: [sender] });
    }
}

module.exports = {
    handleMessageCreate,
    handleMessageUpdate,
    handleMessageRevoke
};