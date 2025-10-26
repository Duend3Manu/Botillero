"use strict";

const { MessageMedia } = require('whatsapp-web.js');

/**
 * adaptWhatsappMessage: adapta Message de whatsapp-web.js a una interfaz consistente
 * - Garantiza: body, text, args (array), command (sin prefijo), sendMessage, reply, react (seguro), showLoading (seguro)
 * - Mantiene métodos útiles: downloadMedia, downloadQuotedMedia, sendImage, sendSticker
 */
async function adaptWhatsappMessage(client, msg) {
    if (!msg || !msg.from) return null;

    // Información básica del contacto/chat
    let contact = {};
    let chat = { isGroup: false };
    try { contact = await msg.getContact(); } catch (e) { /* ignore */ }
    try { chat = await msg.getChat(); } catch (e) { /* ignore */ }

    const quotedMsg = msg.hasQuotedMsg ? await msg.getQuotedMessage().catch(() => null) : null;
    let richQuotedMsgInfo = null;
    if (quotedMsg) {
        try {
            const quotedContact = await quotedMsg.getContact();
            richQuotedMsgInfo = {
                from: quotedMsg.from,
                author: quotedMsg.author,
                text: quotedMsg.body,
                senderName: quotedContact.pushname || quotedContact.name,
                hasMedia: quotedMsg.hasMedia,
                mediaType: quotedMsg.type,
                isAnimated: quotedMsg.isAnimated,
                downloadMedia: () => quotedMsg.downloadMedia()
            };
        } catch (e) { /* ignore */ }
    }

    // Texto y parsing de comando/args
    const rawBody = (msg.body || '').toString();
    
    // Limpiar menciones del cuerpo del mensaje para evitar interferir con los comandos
    // Si hay menciones, se quitan y se hace un trim. Si no, se usa el body tal cual.
    const cleanedBody = (msg.mentionedIds && msg.mentionedIds.length > 0)
        ? rawBody.replace(/@\d+/g, '')
        : rawBody;

    const trimmed = cleanedBody.trim();
    const hasPrefix = trimmed.startsWith('!') || trimmed.startsWith('/');
    const command = hasPrefix ? trimmed.slice(1).split(/\s+/)[0].toLowerCase() : null;
    const args = hasPrefix
        ? (trimmed.split(/\s+/).slice(1))
        : (((trimmed).length > 0) ? trimmed.split(/\s+/) : []);

    // helpers seguros para react / showLoading (suprimir errores conocidos)
    async function safeReact(emoji) {
        if (!msg || !msg.react) return false;
        try {
            await msg.react(emoji);
            return true;
        } catch (err) {
            const short = (err && err.message) ? err.message : String(err);
            if (short.includes('Reaction send error')) {
                console.warn('[adapter] react suppressed:', short);
            } else {
                console.warn('[adapter] react error:', short);
            }
            return false;
        }
    }
    async function safeShowLoading() {
        if (!msg || !msg.react) return;
        try {
            await msg.react('⏳');
        } catch (err) {
            const short = (err && err.message) ? err.message : String(err);
            if (!short.includes('Reaction send error')) {
                console.warn('[adapter] showLoading failed:', short);
            }
        }
    }

    return {
        platform: 'whatsapp',
        chat: chat,
        id: msg.id && msg.id._serialized ? msg.id._serialized : undefined,
        chatId: msg.from,
        text: rawBody,
        body: rawBody,                // alias legacy
        command,                      // comando sin prefijo (o null)
        args,                         // array (si no hay prefix puede ser palabras del body)
        getArgs: () => args,
        senderId: msg.author || msg.from,
        senderName: contact.pushname || contact.name || 'Usuario',
        isGroup: chat.isGroup,
        timestamp: msg.timestamp,
        mentionedIds: msg.mentionedIds,

        hasMedia: msg.hasMedia,
        mediaType: msg.type,
        isAnimated: msg.isAnimated,

        hasQuotedMsg: msg.hasQuotedMsg,
        quotedMsgInfo: richQuotedMsgInfo,

        // Enviar mensaje simple (texto o Media)
        sendMessage: (content, options) => client.sendMessage(msg.from, content, options),

        // reply ya no usará el método obsoleto msg.reply.
        // Usará client.sendMessage con el ID del mensaje original para citarlo.
        reply: (text, options) => {
            const replyOptions = {
                ...(options || {}),
                quotedMessageId: msg.id._serialized
            };
            return client.sendMessage(msg.from, text, replyOptions);
        },

        // react / showLoading seguros
        react: safeReact,
        showLoading: safeShowLoading,

        // media helpers
        downloadMedia: () => msg.downloadMedia && msg.downloadMedia(),
        downloadQuotedMedia: async () => {
            if (!quotedMsg) return null;
            return quotedMsg.downloadMedia && quotedMsg.downloadMedia();
        },

                sendImage: async (imagePathOrUrl, caption) => {
            let media = null;
            try {
                if (typeof imagePathOrUrl === 'string' && imagePathOrUrl.startsWith('http')) {
                    media = await MessageMedia.fromUrl(imagePathOrUrl, { unsafeMime: true });
                } else if (MessageMedia.fromFilePath) {
                    media = MessageMedia.fromFilePath(imagePathOrUrl);
                }
            } catch (error) {
                console.error(`[adapter.sendImage] Failed to create MessageMedia: ${error.message}`);
                return null;
            }

            if (!media) {
                console.error(`[adapter.sendImage] Could not create media from: ${imagePathOrUrl}`);
                return null;
            }
            
            return client.sendMessage(msg.from, media, { caption });
        },

        sendSticker: async (media) => {
            const stickerOptions = {
                sendMediaAsSticker: true,
                stickerAuthor: "Botillero",
                stickerName: "Creado por Botillero"
            };
            return client.sendMessage(msg.from, media, stickerOptions);
        }
    };
}

/**
 * adaptMessage: wrapper genérico.
 * llamadas soportadas:
 *  - adaptMessage(client, msg) -> detecta WhatsApp y adapta
 *  - adaptMessage(client, 'whatsapp', msg)
 */
async function adaptMessage(client, platformOrMsg, maybeMsg) {
    // adaptMessage(client, msg)
    if (typeof platformOrMsg === 'object' && maybeMsg === undefined) {
        return adaptWhatsappMessage(client, platformOrMsg);
    }
    // adaptMessage(client, 'whatsapp', msg)
    const platform = platformOrMsg;
    const msg = maybeMsg;
    if (platform === 'whatsapp') return adaptWhatsappMessage(client, msg);

    return null;
}

module.exports = {
    adaptMessage,
    adaptWhatsappMessage
};