"use strict";

const axios = require('axios');
const cheerio = require('cheerio');

async function searchXvideos(keyword) {
    try {
        const searchUrl = `https://www.xvideos.com/?k=${encodeURIComponent(keyword)}`;
        // Agregamos User-Agent para evitar bloqueos
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const videos = [];

        $('.mozaique .thumb-block').each((index, element) => {
            const title = $(element).find('.thumb-under .title').text().trim();
            const durationText = $(element).find('.thumb-under .duration').text().trim();
            const viewsText = $(element).find('.thumb-under .views').text().trim();
            
            const views = parseViews(viewsText);
            const url = $(element).find('.thumb a').attr('href');
            const thumbnail = $(element).find('.thumb img').attr('data-src') || $(element).find('.thumb img').attr('src');

            if (title && url) {
                videos.push({ title, duration: durationText, views, url, thumbnail });
            }
        });

        videos.sort((a, b) => {
            if (a.views !== b.views) {
                return b.views - a.views; // Ordenar por vistas de forma descendente
            }
            const durationA = getDurationInSeconds(a.duration);
            const durationB = getDurationInSeconds(b.duration);
            return durationB - durationA; // Ordenar por duración de forma descendente
        });

        return videos;
    } catch (error) {
        console.error('Error al buscar en Xvideos:', error.message);
        throw new Error('Ocurrió un error al buscar en Xvideos.');
    }
}

function parseViews(viewsText) {
    if (!viewsText) return 0;
    // Limpiar texto: "1.5M Views" -> "1.5m"
    let clean = viewsText.toLowerCase().replace(/,/g, '').replace(/\s/g, '');
    // Quitar palabras comunes
    clean = clean.replace(/views|vistas/g, '');
    
    let multiplier = 1;
    if (clean.endsWith('k')) {
        multiplier = 1000;
        clean = clean.slice(0, -1);
    } else if (clean.endsWith('m')) {
        multiplier = 1000000;
        clean = clean.slice(0, -1);
    }
    
    const number = parseFloat(clean);
    return isNaN(number) ? 0 : number * multiplier;
}

function getDurationInSeconds(duration) {
    if (!duration) return 0;

    // Manejo de formatos de texto como "10 min", "1 h 5 min"
    if (duration.includes('h') || duration.includes('min') || duration.includes('sec')) {
        let seconds = 0;
        const hMatch = duration.match(/(\d+)\s*h/);
        const mMatch = duration.match(/(\d+)\s*min/);
        const sMatch = duration.match(/(\d+)\s*sec/);
        
        if (hMatch) seconds += parseInt(hMatch[1]) * 3600;
        if (mMatch) seconds += parseInt(mMatch[1]) * 60;
        if (sMatch) seconds += parseInt(sMatch[1]);
        
        return seconds;
    }

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
