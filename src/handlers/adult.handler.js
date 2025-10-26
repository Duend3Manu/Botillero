"use strict";

const adultService = require('../services/adult.service');

async function handleXvideosSearch(message) {
    const keyword = message.body.substring(message.body.indexOf(' ') + 1).trim();
    if (!keyword) {
        return "Por favor, escribe un término de búsqueda. Ejemplo: `!xv ...`";
    }

    await message.reply("🔞 *Advertencia:* El contenido a continuación es para adultos. Proceda con discreción.");

    try {
        const videos = await adultService.searchXvideos(keyword);

        if (videos.length === 0) {
            return `No se encontraron videos para *"${keyword}"*.`;
        }

        let replyMessage = `Resultados de búsqueda en Xvideos para *"${keyword}"*:\n\n`;

        videos.slice(0, 12).forEach((video) => {
            replyMessage += `${video.title}\n`;
            replyMessage += `Duración: ${video.duration}\n`;
            replyMessage += `URL: https://www.xvideos.com${video.url}\n\n`;
        });

        return replyMessage;
    } catch (error) {
        console.error('Error al buscar en Xvideos:', error.message);
        return 'Ocurrió un error al buscar en Xvideos.';
    }
}

module.exports = {
    handleXvideosSearch
};
