"use strict";

const axios = require('axios');
const cheerio = require('cheerio');

async function searchXvideos(keyword) {
    try {
        const searchUrl = `https://www.xvideos.com/?k=${encodeURIComponent(keyword)}`;
        const response = await axios.get(searchUrl);

        const $ = cheerio.load(response.data);
        const videos = [];

        $('.mozaique .thumb-block').each((index, element) => {
            const title = $(element).find('.thumb-under .title').text().trim();
            const duration = $(element).find('.thumb-under .duration').text().trim();
            const views = parseInt($(element).find('.thumb-under .views').text().trim().replace(',', ''));
            const url = $(element).find('.thumb a').attr('href');

            videos.push({ title, duration, views, url });
        });

        videos.sort((a, b) => {
            if (a.views !== b.views) {
                return b.views - a.views; // Ordenar por vistas de forma descendente
            }
            const durationA = getDurationInSeconds(a.duration);
            const durationB = getDurationInSeconds(b.duration);
            return durationB - durationA; // Ordenar por duración de forma ascendente
        });

        return videos;
    } catch (error) {
        console.error('Error al buscar en Xvideos:', error.message);
        throw new Error('Ocurrió un error al buscar en Xvideos.');
    }
}

function getDurationInSeconds(duration) {
    const parts = duration.split(':');
    if (parts.length === 3) {
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const seconds = parseInt(parts[2]);
        return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
        const minutes = parseInt(parts[0]);
        const seconds = parseInt(parts[1]);
        return minutes * 60 + seconds;
    } else if (parts.length === 1) {
        const seconds = parseInt(parts[0]);
        return seconds;
    }
    return 0;
}

module.exports = {
    searchXvideos
};
