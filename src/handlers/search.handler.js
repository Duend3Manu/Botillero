// src/handlers/search.handler.js
"use strict";

const axios = require('axios');
const cheerio = require('cheerio');
const GoogleIt = require('google-it');
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

async function handleGoogleSearch(message) {
    const searchTerm = message.body.substring(message.body.indexOf(' ') + 1).trim();
    if (!searchTerm) {
        return "Escribe algo para buscar en Google. Ejemplo: `!g gatitos`";
    }
    
    try {
        const results = await GoogleIt({ query: searchTerm });
        
        // --- INICIO DE LA MEJORA ---
        // 1. Verificamos si la respuesta es válida y tiene resultados.
        if (!results || results.length === 0) {
            console.log("La librería google-it no devolvió resultados para:", searchTerm);
            return `No se encontraron resultados en Google para *"${searchTerm}"*.`;
        }
        // --- FIN DE LA MEJORA ---

        let response = `Resultados de Google para *"${searchTerm}"*:\n\n`;
        results.slice(0, 4).forEach((result, index) => {
            response += `*${index + 1}. ${result.title}*\n`;
            response += `_${result.snippet}_\n`;
            response += `${result.link}\n\n`;
        });
        return response;
    } catch (error) {
        console.error("Error en búsqueda de Google:", error);
        return "Hubo un error al buscar en Google.";
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