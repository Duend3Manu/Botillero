// src/services/messaging.service.js
"use strict";

const axios = require('axios');
const { MessageMedia } = require('whatsapp-web.js');

const SPOTIFY_API_URL = 'https://celuzador.porsilapongo.cl/spotify.php';

/**
 * Envía un mensaje de "procesando" con una pista de Spotify aleatoria.
 * @param {import('whatsapp-web.js').Message} message El objeto del mensaje original al que se responderá.
 */
async function sendLoadingMessage(message) {
    try {
        // 1. Llama a la API para obtener una canción aleatoria
        const { data: track } = await axios.get(SPOTIFY_API_URL);

        if (track && track.nombre && track.url) {
            // 2. Formatea el mensaje de texto
            const caption = `Procesando tu solicitud... ⏳\n\n_Mientras esperas, ¿qué tal esta canción?_\n\n🎶 *${track.nombre}* - ${track.artistas}\n🔗 ${track.url}`;

            // 3. Carga la imagen de la carátula
            const media = await MessageMedia.fromUrl(track.imagen, { unsafeMime: true });

            // 4. Envía la imagen con el texto como pie de foto
            await message.reply(media, undefined, { caption: caption });
        } else {
            // Si la API falla pero no da error, envía un mensaje simple
            await message.reply("Procesando tu solicitud... ⏳");
        }
    } catch (error) {
        console.error("Error al obtener la pista de Spotify:", error.message);
        // Si la API da error, envía un mensaje de texto simple como respaldo
        await message.reply("Procesando tu solicitud... ⏳");
    }
}

module.exports = {
    sendLoadingMessage
};