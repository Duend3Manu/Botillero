// src/handlers/sticker-pack.handler.js
"use strict";

const axios = require('axios');

const TOKEN = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${TOKEN}`;

// Sesión temporal: userId -> { fileId, timestamp }
const stickerSession = new Map();
const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Limpiar sesiones viejas cada 10 minutos
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of stickerSession.entries()) {
        if (now - val.timestamp > SESSION_TTL_MS) stickerSession.delete(key);
    }
}, 10 * 60 * 1000);

/**
 * Llama al Bot API de Telegram directamente (JSON body via axios).
 */
async function callApi(method, params = {}) {
    try {
        const response = await axios.post(`${API_URL}/${method}`, params, {
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.data.ok) {
            throw new Error(`API error (${method}): ${response.data.description}`);
        }
        return response.data.result;
    } catch (err) {
        // Mostrar el body del error de Telegram si está disponible
        const detail = err.response?.data?.description || err.message;
        throw new Error(`(${method}): ${detail}`);
    }
}

/**
 * Nombre corto del pack de stickers para este usuario.
 * Telegram añade automáticamente "_by_{botUsername}" al final.
 */
function getPackShortName(userId) {
    return `botillero${userId}`;
}

/**
 * Verifica si el pack de stickers del usuario ya existe.
 */
async function packExists(userId, botUsername) {
    const name = `${getPackShortName(userId)}_by_${botUsername}`;
    try {
        await callApi('getStickerSet', { name });
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Crea un nuevo pack de stickers para el usuario con el sticker dado (por file_id).
 * Bot API 7.2+: stickers es un array de InputSticker (objeto, no string).
 * sticker_format fue deprecado — el format va dentro de cada InputSticker.
 */
async function createStickerPack(userId, fileId, botUsername) {
    // ⚠️ Telegram requiere el nombre COMPLETO incluyendo _by_{botUsername}
    const name = `${getPackShortName(userId)}_by_${botUsername}`;
    return callApi('createNewStickerSet', {
        user_id: userId,
        name,
        title: 'Botillero 🎰',
        stickers: [{
            sticker: fileId,
            format: 'static',
            emoji_list: ['🎭']
        }]
    });
}

/**
 * Agrega un sticker (por file_id) al pack existente del usuario.
 * Bot API 7.0+: sticker es un objeto InputSticker (no string JSON).
 */
async function addToStickerPack(userId, fileId, botUsername) {
    const name = `${getPackShortName(userId)}_by_${botUsername}`;
    return callApi('addStickerToSet', {
        user_id: userId,
        name,
        sticker: {
            sticker: fileId,
            format: 'static',
            emoji_list: ['🎭']
        }
    });
}

/**
 * Guarda el file_id del sticker en la sesión temporal para usar desde el callback.
 */
function saveStickerSession(userId, fileId) {
    stickerSession.set(String(userId), { fileId, timestamp: Date.now() });
}

/**
 * Obtiene y elimina el file_id de la sesión temporal.
 */
function consumeStickerSession(userId) {
    const session = stickerSession.get(String(userId));
    if (session) stickerSession.delete(String(userId));
    return session ? session.fileId : null;
}

/**
 * Construye el teclado inline para ofrecer agregar al pack.
 */
function getStickerPackKeyboard(userId) {
    return {
        inline_keyboard: [[
            {
                text: '📦 Agregar al pack de Botillero',
                callback_data: `sticker_pack:${userId}`
            }
        ]]
    };
}

module.exports = {
    saveStickerSession,
    consumeStickerSession,
    getStickerPackKeyboard,
    packExists,
    createStickerPack,
    addToStickerPack,
    getPackShortName
};
