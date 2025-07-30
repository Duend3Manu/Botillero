// src/services/messaging.service.js (Versión final con playlist LOCAL)
"use strict";

const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

/**
 * Lee la playlist local y elige una canción al azar.
 * @returns {object|null}
 */
function getRandomTrackFromLocalPlaylist() {
    try {
        // Leemos nuestro archivo JSON de la playlist
        const playlistPath = path.join(__dirname, '..', 'data', 'playlist_local.json');
        const playlistData = fs.readFileSync(playlistPath, 'utf-8');
        const playlist = JSON.parse(playlistData);

        if (!playlist || playlist.length === 0) {
            return null;
        }

        // Elegimos un índice aleatorio del array de canciones
        const randomIndex = Math.floor(Math.random() * playlist.length);
        return playlist[randomIndex];

    } catch (error) {
        console.error("Error al leer la playlist local:", error.message);
        return null;
    }
}

/**
 * Envía un mensaje de "procesando" con una pista de la playlist local.
 * @param {import('whatsapp-web.js').Message} message El objeto del mensaje original.
 */
async function sendLoadingMessage(message) {
    try {
        const track = getRandomTrackFromLocalPlaylist();

        if (track && track.nombre && track.url) {
            const caption = `Procesando tu solicitud... ⏳\n\n_Mientras esperas, dale una escuchada a esto:_\n\n🎶 *${track.nombre}* - ${track.artistas}\n🔗 ${track.url}`;
            const media = await MessageMedia.fromUrl(track.imagen, { unsafeMime: true });
            await message.reply(media, undefined, { caption: caption });
        } else {
            await message.reply("Procesando tu solicitud... ⏳");
        }
    } catch (error) {
        console.error("Error al generar el mensaje de carga:", error.message);
        await message.reply("Procesando tu solicitud... ⏳");
    }
}

module.exports = {
    sendLoadingMessage
};