// src/handlers/events.handler.js
"use strict";

const { storeMessage, getOriginalMessage } = require('../utils/db.js');

// Se activa cuando un usuario crea un mensaje
async function handleMessageCreate(client, message) {
    if (!message.fromMe) {
        // Guardamos una copia de cada mensaje para poder compararlo si se edita
        storeMessage(message.id._serialized, message.body);
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
    try {
        // CASO 1: El mensaje estaba en la memoria RAM (lo más común)
        if (before) {
            if (before.fromMe) return; // No nos acusamos a nosotros mismos

            const chat = await before.getChat();
            const sender = await before.getContact();
            
            let content = `_"${before.body}"_`;

            if (before.hasMedia || before.type !== 'chat') {
                const typeMap = {
                    image: 'una imagen 📷',
                    video: 'un video 🎥',
                    sticker: 'un sticker 👾',
                    audio: 'un audio 🎤',
                    ptt: 'un audio de voz 🎤',
                    document: 'un documento 📄'
                };
                const typeName = typeMap[before.type] || 'un archivo multimedia';
                content = before.body ? `${typeName} que decía:\n_"${before.body}"_` : typeName;
            }

            const message = `El usuario @${sender.id.user} eliminó ${content}`;
            await client.sendMessage(chat.id._serialized, message, { mentions: [sender] });
            return;
        }

        // CASO 2: El mensaje es antiguo y no estaba en RAM (ej: después de reiniciar el bot)
        // Usamos el objeto 'after' para buscar el ID en nuestra base de datos
        if (after && !after.id.fromMe) {
            const originalBody = await getOriginalMessage(after.id._serialized);
            
            if (originalBody) {
                const chat = await after.getChat();
                const senderId = after.author || after.from; // En grupos es author, en DM es from
                const sender = await client.getContactById(senderId);

                const message = `El usuario @${sender.id.user} eliminó un mensaje (recuperado de memoria):\n\n_"${originalBody}"_`;
                await client.sendMessage(chat.id._serialized, message, { mentions: [sender] });
            }
        }
    } catch (error) {
        // Ignoramos errores de getChatById/getChat cuando WhatsApp Web no tiene el modelo cargado
        // Este es un bug conocido de whatsapp-web.js con ciertos estados del chat
        console.warn('⚠️ No se pudo procesar mensaje eliminado (chat no disponible):', error.message);
    }
}

module.exports = {
    handleMessageCreate,
    handleMessageUpdate,
    handleMessageRevoke
};