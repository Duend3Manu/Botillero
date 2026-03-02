// src/adapters/wwebjs-adapter.js
"use strict";

/**
 * Adaptador de compatibilidad — re-exporta TelegramMedia con el nombre
 * "MessageMedia" para que los handlers existentes no necesiten cambios.
 */

const { TelegramMedia } = require('./telegram-adapter');

module.exports = {
    MessageMedia: TelegramMedia
};
