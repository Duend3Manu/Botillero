// src/adapters/telegram-adapter.js
"use strict";

const fs = require('fs');
const path = require('path');

/**
 * TelegramMedia — replica la interfaz de MessageMedia de whatsapp-web.js.
 * Permite que los handlers existentes (fun.handler, stateful.handler, etc.)
 * sigan funcionando sin modificaciones.
 *
 * Formato del objeto: { mimetype, data (base64), filename }
 * El método reply() en telegram.js ya sabe cómo leer este formato y enviar
 * el archivo con el método correcto (sendAudio, sendPhoto, sendDocument, etc.)
 */
class TelegramMedia {
    constructor(mimetype, data, filename = '') {
        this.mimetype = mimetype;
        this.data = data; // base64
        this.filename = filename;
    }

    /**
     * Crea un TelegramMedia desde una ruta de archivo local.
     * @param {string} filePath - Ruta absoluta al archivo
     * @returns {TelegramMedia}
     */
    static fromFilePath(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Archivo no encontrado: ${filePath}`);
        }

        const data = fs.readFileSync(filePath);
        const base64 = data.toString('base64');
        const filename = path.basename(filePath);
        const mimetype = guessMinetype(filename);

        return new TelegramMedia(mimetype, base64, filename);
    }

    /**
     * Descarga un archivo desde una URL y lo retorna como TelegramMedia.
     * Usa axios con timeout completo (conexión + descarga) para evitar cuelgues.
     * @param {string} url - URL del archivo (generalmente de bot.getFileLink())
     * @returns {Promise<TelegramMedia>}
     */
    static async fromUrl(url) {
        const axios = require('axios');

        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 20000,  // 20s timeout completo (conexión + descarga)
            maxContentLength: 50 * 1024 * 1024, // máx 50MB
            headers: {
                'User-Agent': 'Botillero/2.0'
            }
        });

        const buffer = Buffer.from(response.data);
        const base64 = buffer.toString('base64');
        const contentType = response.headers['content-type'] || 'application/octet-stream';
        const mimetype = contentType.split(';')[0].trim();
        const filename = path.basename(url.split('?')[0]) || 'file';

        return new TelegramMedia(mimetype, base64, filename);
    }
}

/**
 * Adivina el mimetype a partir de la extensión del archivo.
 * @param {string} filename
 * @returns {string}
 */
function guessMinetype(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimetypes = {
        '.mp3': 'audio/mpeg',
        '.ogg': 'audio/ogg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
        '.json': 'application/json',
        '.txt': 'text/plain',
        '.csv': 'text/csv',
    };
    return mimetypes[ext] || 'application/octet-stream';
}

module.exports = { TelegramMedia };
