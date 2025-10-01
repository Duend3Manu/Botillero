"use strict";

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const axios = require('axios');
const cheerio = require('cheerio');
const geminiService = require('../services/gemini.service.js');
const { getPatenteDataFormatted } = require('../utils/apiService');
const puppeteer = require('puppeteer');

async function handleWikiSearch(message) {
    const searchTerm = message.body.substring(message.body.indexOf(' ') + 1).trim();
    if (!searchTerm) {
        return "Por favor, escribe un término para buscar en Wikipedia. Ejemplo: `!wiki Chile`";
    }
    
    await message.react('⏳');
    
    try {
        // Usaremos el endpoint de OpenSearch que es más directo para resúmenes
        const response = await axios.get('https://es.wikipedia.org/w/api.php', {
            params: {
                action: 'opensearch',
                search: searchTerm,
                limit: 1, // Solo queremos el resultado más relevante
                namespace: 0,
                format: 'json'
            }
        });

        // La respuesta de opensearch es un array: [término, [títulos], [descripciones], [links]]
        const titles = response.data[1];
        const descriptions = response.data[2];
        const links = response.data[3];

        if (titles.length === 0) {
            await message.react('❌');
            return `No se encontraron resultados en Wikipedia para "${searchTerm}".`;
        }

        await message.react('✅');
        return `📖 *${titles[0]}*\n\n${descriptions[0]}...\n\n*Fuente:* ${links[0]}`;
    } catch (error) {
        await message.react('❌');
        console.error('Error en la búsqueda de Wikipedia:', error);
        return 'Ocurrió un error al buscar en Wikipedia.';
    }
}

// noticias //

async function handleNews(message) {
    await message.react('📰');
    const url = 'http://chile.infoflow.cloud/p.php/infoflow2017/noticias-nacionales';
    let browser = null;

    try {
        console.log(`(DEBUG) -> Iniciando Puppeteer para noticias...`);
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Esperamos a que el selector de noticias esté visible
        await page.waitForSelector('div.noticia-23', { timeout: 10000 });

        // Extraemos los datos usando page.evaluate
        const newsItems = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('div.noticia-23').forEach(element => {
                const titleElement = element.querySelector('a');
                const title = titleElement ? titleElement.innerText.trim() : null;
                let link = titleElement ? titleElement.getAttribute('href') : null;

                if (link && !link.startsWith('http')) {
                    link = 'http://chile.infoflow.cloud' + link;
                }

                if (title && link) {
                    items.push(`Titular: ${title}, Enlace: ${link}`);
                }
            });
            return items;
        });
        
        await browser.close();
        console.log(`(DEBUG) -> Puppeteer cerrado. ${newsItems.length} noticias encontradas.`);

        if (newsItems.length === 0) {
            return 'No pude encontrar titulares de noticias en la página (el formato puede haber cambiado).';
        }

        const newsString = newsItems.join('\n');
        const prompt = `
        Actúa como un periodista para un chat de WhatsApp.
        Basado en la siguiente lista de noticias de Chile, donde cada línea tiene un titular y un enlace:
        ---
        ${newsString}
        ---
        Crea un resumen de máximo 5 puntos clave con emojis.
        Para CADA punto clave, incluye el enlace correspondiente a la noticia que estás resumiendo.
        Sé conciso y directo.
        `.trim();
        
        const summary = await geminiService.generateText(prompt);
        return "📰 *Resumen de Noticias Nacionales:*\n\n" + summary;

    } catch (error) {
        if (browser) await browser.close(); // Nos aseguramos de cerrar el navegador si hay un error
        console.error('Error al obtener las noticias con Puppeteer:', error);
        return 'Lo siento, no pude obtener las noticias en este momento.';
    }
}

async function handleGoogleSearch(message) {
    // ... tu función de Google Search se mantiene igual ...
    const searchTerm = message.body.substring(message.body.indexOf(' ') + 1).trim();
    if (!searchTerm) { return "Escribe algo para buscar en Google. Ejemplo: `!g gatitos`"; }
    const API_KEY = process.env.GOOGLE_API_KEY;
    const CSE_ID = process.env.GOOGLE_CSE_ID;
    if (!API_KEY || !CSE_ID) { return "El comando de búsqueda de Google no está configurado."; }
    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CSE_ID}&q=${encodeURIComponent(searchTerm)}`;
    try {
        const response = await axios.get(url);
        const results = response.data.items;
        if (!results || results.length === 0) { return `No se encontraron resultados en Google para *"${searchTerm}"*.`; }
        let replyMessage = `Resultados de Google para *"${searchTerm}"*:\n\n`;
        results.slice(0, 4).forEach((result, index) => {
            replyMessage += `*${index + 1}. ${result.title}*\n_${result.snippet}_\n${result.link}\n\n`;
        });
        return replyMessage;
    } catch (error) {
        console.error("Error en búsqueda de Google API:", error.response ? error.response.data : error.message);
        return "Hubo un error al conectar con la API de Google.";
    }
}


 // patente //
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