// src/handlers/group.handler.js (VERSIÓN WHATSAPP)
"use strict";

/**
 * Etiqueta a todos los participantes de un grupo.
 * @param {Object} client - Instancia de whatsapp-web.js
 * @param {Object} message - Mensaje nativo de whatsapp-web.js
 */
async function handleTagAll(client, message) {
    try {
        const chat = await message.getChat();
        if (!chat.isGroup) {
            return message.reply("Este comando solo se puede usar en grupos.");
        }

        // --- Verificar que el usuario es administrador (opcional) ---
        const contact = await message.getContact();
        const participant = chat.participants.find(p => p.id._serialized === contact.id._serialized);
        
        if (!participant || (!participant.isAdmin && !participant.isSuperAdmin)) {
            return message.reply("👮‍♂️ Alto ahí. Solo los administradores pueden invocar a todos.");
        }

        const customText = message.body.replace(/^!todos\s*/i, '').trim();
        let text = customText ? `📢 *${customText}*\n\n` : "📢 *Atención grupo:*\n\n";
        
        const mentions = [];
        for (const part of chat.participants) {
            const memberContact = await client.getContactById(part.id._serialized);
            mentions.push(memberContact);
            text += `@${part.id.user} `;
        }
        
        await chat.sendMessage(text, { mentions });

    } catch (e) {
        console.error("Error en handleTagAll:", e);
        message.reply("Hubo un error al intentar etiquetar a todos.");
    }
}

module.exports = {
    handleTagAll
};