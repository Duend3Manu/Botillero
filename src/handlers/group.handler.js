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

        // --- MEJORA 1: Seguridad (Solo Admins) ---
        const authorId = message.author || message.from;
        const participant = chat.participants.find(p => p.id._serialized === authorId);
        
        if (!participant || !participant.isAdmin) {
            return message.reply("👮‍♂️ Alto ahí. Solo los administradores pueden invocar a todos.");
        }

        // --- MEJORA 2: Mensaje Personalizado ---
        // Limpiamos el comando del inicio para obtener solo el texto del mensaje
        const customText = message.body.replace(/^([!/])\w+\s*/i, '').trim();
        let text = customText ? `📢 *${customText}*\n\n` : "📢 *Atención grupo:*\n\n";
        
        let mentions = [];

        // --- MEJORA 3: Optimización (Carga Paralela) ---
        // 1. Filtramos al propio bot para que no se auto-etiquete (es redundante)
        const botId = client.info.wid._serialized;
        const participantsToTag = chat.participants.filter(p => p.id._serialized !== botId);

        // 2. Carga robusta: Si falla un contacto, no rompemos todo el comando
        const contactPromises = participantsToTag.map(p => 
            client.getContactById(p.id._serialized).catch(() => null)
        );
        const results = await Promise.all(contactPromises);
        const contacts = results.filter(c => c !== null); // Filtramos los que fallaron

        for (const contact of contacts) {
            mentions.push(contact);
            text += `@${contact.id.user} `;
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