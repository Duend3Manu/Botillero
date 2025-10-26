// src/handlers/group.handler.js
"use strict";

/**
 * Etiqueta a todos los participantes de un grupo.
 * @param {Client} client - El objeto del cliente de WhatsApp.
 * @param {Message} message - El objeto del mensaje que activó el comando.
 */
async function handleTagAll(client, message) {
    try {
        const chat = await message.getChat();

        // 1. Verificar si el chat es un grupo
        if (!chat.isGroup) {
            return message.reply("Este comando solo se puede usar en grupos.");
        }

        // 2. Obtener todos los participantes del grupo
        const participants = chat.participants;
        
        let text = "";
        let mentions = [];

        // 3. Construir el texto y la lista de menciones
        for (let participant of participants) {
            // El ID del contacto se usa para la mención
            const contact = await client.getContactById(participant.id._serialized);
            mentions.push(contact);
            text += `@${participant.id.user} `;
        }

        // 4. Enviar el mensaje con el texto y las menciones
        // Se envía al ID del chat, y se pasa la opción 'mentions'
        await chat.sendMessage(text, { mentions });

    } catch (e) {
        console.error("Error en handleTagAll:", e);
        message.reply("Hubo un error al intentar etiquetar a todos.");
    }
}

module.exports = {
    handleTagAll
};