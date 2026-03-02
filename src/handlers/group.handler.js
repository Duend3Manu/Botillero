// src/handlers/group.handler.js
"use strict";

/**
 * Etiqueta a todos los participantes de un grupo.
 * Implementación para Telegram usando getChatAdministrators y menciones por username.
 * @param {Object} client - Instancia del bot de Telegram (node-telegram-bot-api)
 * @param {Object} message - Mensaje adaptado (con _raw.chat.id, etc.)
 */
async function handleTagAll(client, message) {
    try {
        // --- Verificar que es un grupo ---
        const chat = await message.getChat();
        if (!chat.isGroup) {
            return message.reply("Este comando solo se puede usar en grupos.");
        }

        const chatId = message.from; // En Telegram el ID del chat

        // --- Verificar que el usuario es administrador ---
        const senderId = parseInt(message.author || message._raw?.from?.id);
        let isAdmin = false;

        try {
            const admins = await client.getChatAdministrators(chatId);
            isAdmin = admins.some(a => a.user.id === senderId);
        } catch (adminErr) {
            console.error("(TagAll) -> Error obteniendo admins:", adminErr.message);
            // En caso de error, permitir igualmente (puede ser chat privado administrado)
        }

        if (!isAdmin) {
            return message.reply("👮‍♂️ Alto ahí. Solo los administradores pueden invocar a todos.");
        }

        // --- Mensaje personalizado (extraer texto después del comando) ---
        const customText = message.body.replace(/^([!/])\w+\s*/i, '').trim();
        let text = customText ? `📢 *${customText}*\n\n` : "📢 *Atención grupo:*\n\n";

        // --- Obtener miembros con username para mencionar ---
        try {
            const admins = await client.getChatAdministrators(chatId);
            // En Telegram Bot API solo podemos obtener administradores fácilmente
            // Los miembros regulares requieren permisos especiales o tracking propio.
            // Mencionamos a los admins disponibles y notificamos la limitación.
            const mentions = [];

            for (const admin of admins) {
                const user = admin.user;
                if (!user.is_bot) {
                    if (user.username) {
                        text += `@${user.username} `;
                        mentions.push(user.username);
                    } else {
                        // Sin username: usar nombre (no genera mención clicable pero es visible)
                        text += `${user.first_name} `;
                    }
                }
            }

            text += '\n\n_ℹ️ Nota: En Telegram solo se pueden mencionar administradores automáticamente._';

            await message.reply(text);

        } catch (err) {
            console.error("(TagAll) -> Error obteniendo membros:", err.message);
            await message.reply("📢 " + (customText || "Atención grupo") + "\n\n_(No se pudo obtener la lista de miembros)_");
        }

    } catch (e) {
        console.error("Error en handleTagAll:", e);
        message.reply("Hubo un error al intentar etiquetar a todos.");
    }
}

module.exports = {
    handleTagAll
};