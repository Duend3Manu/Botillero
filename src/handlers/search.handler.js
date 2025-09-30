"use strict";

const axios = require('axios');
const cheerio = require('cheerio');
// Se elimina la importación de 'google-it' porque ya no se usa.
const { getPatenteDataFormatted } = require('../utils/apiService');

async function handleWikiSearch(message) {
    const searchTerm = message.body.substring(message.body.indexOf(' ') + 1).trim();
    if (!searchTerm) {
        return "Por favor, escribe un término para buscar en Wikipedia. Ejemplo: `!wiki Chile`";
    }

    try {
        const response = await axios.get('https://es.wikipedia.org/w/api.php', {
            params: {
                action: 'query',
                format: 'json',
                list: 'search',
                srsearch: searchTerm,
                utf8: 1,
                srlimit: 3,
            },
        });

        if (response.data.query.search.length === 0) {
            return `No se encontraron resultados en Wikipedia para "${searchTerm}".`;
        }

        let replyMessage = `Resultados de Wikipedia para *"${searchTerm}"*:\n\n`;
        for (const result of response.data.query.search) {
            const articleLink = `https://es.wikipedia.org/wiki/${encodeURIComponent(result.title)}`;
            const cleanSnippet = result.snippet.replace(/<span class="searchmatch">/g, '*').replace(/<\/span>/g, '*');
            
            replyMessage += `*${result.title}*\n`;
            replyMessage += `_${cleanSnippet}..._\n`;
            replyMessage += `${articleLink}\n\n`;
        }
        return replyMessage;

    } catch (error) {
        console.error('Error en la búsqueda de Wikipedia:', error);
        return 'Ocurrió un error al buscar en Wikipedia.';
    }
}

async function handleNews(message) {
    try {
        const response = await axios.get('http://chile.infoflow.cloud/p.php/infoflow2017/noticias-nacionales');
        const html = response.data;
        const $ = cheerio.load(html);

        let newsText = $('body').text().trim();
        newsText = newsText.replace(/editor-card/g, '');
        newsText = newsText.replace(/\n\s*\n/g, '\n\n');

        return "📰 *Noticias Nacionales - Última Hora:*\n\n" + newsText;
    } catch (error) {
        console.error('Error al obtener las noticias:', error);
        return 'Lo siento, no pude obtener las noticias en este momento.';
    }
}

// --- FUNCIÓN DE BÚSQUEDA DE GOOGLE CORREGIDA ---
async function handleGoogleSearch(message) {
    const searchTerm = message.body.substring(message.body.indexOf(' ') + 1).trim();
    if (!searchTerm) {
        return "Escribe algo para buscar en Google. Ejemplo: `!g gatitos`";
    }

    // Leemos las claves desde el archivo .env DENTRO de la función
    const API_KEY = process.env.GOOGLE_API_KEY;
    const CSE_ID = process.env.GOOGLE_CSE_ID;

    if (!API_KEY || !CSE_ID) {
        return "El comando de búsqueda de Google no está configurado. Faltan las claves de API en el archivo .env";
    }
    
    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CSE_ID}&q=${encodeURIComponent(searchTerm)}`;

    try {
        const response = await axios.get(url);
        const results = response.data.items;

        if (!results || results.length === 0) {
            return `No se encontraron resultados en Google para *"${searchTerm}"*.`;
        }

        let replyMessage = `Resultados de Google para *"${searchTerm}"*:\n\n`;
        results.slice(0, 4).forEach((result, index) => {
            replyMessage += `*${index + 1}. ${result.title}*\n`;
            replyMessage += `_${result.snippet}_\n`;
            replyMessage += `${result.link}\n\n`;
        });
        return replyMessage;

    } catch (error) {
        console.error("Error en búsqueda de Google API:", error.response ? error.response.data : error.message);
        return "Hubo un error al conectar con la API de Google.";
    }
}

async function handlePatenteSearch(message) {
    const patente = message.body.substring(message.body.indexOf(' ') + 1).trim();
    if (!patente) {
        return "Debes ingresar una patente. Ejemplo: `!pat aabb12`";
    }

    const result = await getPatenteDataFormatted(patente);
    return result.error ? result.message : result.data;
}

module.exports = {
    handleWikiSearch,
    handleNews,
    handleGoogleSearch,
    handlePatenteSearch
};