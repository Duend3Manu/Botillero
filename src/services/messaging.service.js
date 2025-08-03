// src/services/messaging.service.js
"use strict";

const fs = require('fs');
const path = require('path');

/**
 * Lee la playlist local y elige una canción al azar.
 * @returns {object|null}
 */
function getRandomTrackFromLocalPlaylist() {
    try {
        // Asumiendo que tendrás una carpeta 'data' con este archivo
        const playlistPath = path.join(__dirname, '..', '..', 'data', 'playlist_local.json');
        if (!fs.existsSync(playlistPath)) {
            console.warn("Advertencia: No se encontró el archivo playlist_local.json. El mensaje de carga no mostrará canciones.");
            return null;
        }
        const playlistData = fs.readFileSync(playlistPath, 'utf-8');
        const playlist = JSON.parse(playlistData);

        if (!playlist || playlist.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * playlist.length);
        return playlist[randomIndex];

    } catch (error) {
        console.error("Error al leer la playlist local:", error.message);
        return null;
    }
}

/**
 * Envía un mensaje de "procesando" con una pista de la playlist local (solo texto).
 * @param {import('whatsapp-web.js').Message} message El objeto del mensaje original.
 */
async function sendLoadingMessage(message) {
    try {
        const track = getRandomTrackFromLocalPlaylist();

        if (track && track.nombre && track.url) {
            const textMessage = `Procesando tu solicitud... ⏳\n\n_Mientras esperas, dale una escuchada a esto:_\n\n🎶 *${track.nombre}* - ${track.artistas}\n🔗 ${track.url}`;
            await message.reply(textMessage);
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
