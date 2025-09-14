"use strict";

// --- CHIVATO 1 ---
// Si ves este mensaje al arrancar, significa que el bot está leyendo este archivo correctamente.
console.log("--- ✅ CARGANDO ADAPTADOR DE WHATSAPP VERSIÓN 'ANTI-PORFIADO' ---");

const { MessageMedia } = require('whatsapp-web.js');

async function adaptWhatsappMessage(client, msg) {
    if (!msg.from || !msg.getContact) {
        return null;
    }

    const contact = await msg.getContact();
    const chat = await msg.getChat();

    return {
        platform: 'whatsapp',
        chatId: msg.from,
        text: msg.body || '',
        args: (msg.body || '').split(/\s+/).slice(1),
        senderId: msg.author || msg.from,
        senderName: contact.pushname || contact.name || 'Usuario',
        isGroup: chat.isGroup,

        reply: (text) => msg.reply(text),
        
        sendImage: async (imagePathOrUrl, caption) => {
            // --- CHIVATO 2 ---
            // Nos dirá exactamente qué está recibiendo la función.
            console.log(`[ADAPTADOR] La función sendImage recibió: "${imagePathOrUrl}"`);
            
            let media;
            if (imagePathOrUrl.startsWith('http')) {
                // --- CHIVATO 3 ---
                // Si entra aquí, significa que la lógica de detección de URL funciona.
                console.log("[ADAPTADOR] Detectado como URL. Usando MessageMedia.fromUrl()...");
                media = await MessageMedia.fromUrl(imagePathOrUrl, { unsafeMime: true });
            } else {
                console.log("[ADAPTADOR] Detectado como ruta local. Usando MessageMedia.fromFilePath()...");
                media = MessageMedia.fromFilePath(imagePathOrUrl);
            }
            return client.sendMessage(msg.from, media, { caption });
        },
        
        sendAudio: (audioPath) => {
            const media = MessageMedia.fromFilePath(audioPath);
            return client.sendMessage(msg.from, media);
        },

        sendVoice: (audioPath) => {
            const media = MessageMedia.fromFilePath(audioPath);
            return client.sendMessage(msg.from, media, { sendAudioAsVoice: true });
        },
        
        sendSticker: (stickerPath) => {
            const media = MessageMedia.fromFilePath(stickerPath);
            return client.sendMessage(msg.from, media, { sendMediaAsSticker: true, stickerAuthor: "Botillero" });
        },

        sendAnimation: (gifPath, caption) => {
            const media = MessageMedia.fromFilePath(gifPath);
            return client.sendMessage(msg.from, media, { caption, sendVideoAsGif: true });
        },

        react: (emoji) => msg.react(emoji),
        showLoading: () => msg.react('⏳'),

        getRepliedMessageMediaInfo: async () => {
            if (!msg.hasQuotedMsg) return null;
            const quotedMsg = await msg.getQuotedMessage();
            if (!quotedMsg.hasMedia) return null;
            return { rawMedia: await quotedMsg.downloadMedia(), type: quotedMsg.type, isAnimated: quotedMsg.isAnimated };
        }
    };
}

module.exports = {
    adaptWhatsappMessage
};

