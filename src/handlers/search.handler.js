// src/handlers/search.handler.js
"use strict";

const axios = require('axios');
const cheerio = require('cheerio');
const GoogleIt = require('google-it');
const { MessageMedia } = require('../adapters/wwebjs-adapter');

async function handleWikiSearch(message) {
    // 1. Extracción robusta con Regex
    const searchTerm = message.body.replace(/^([!/])wiki\s*/i, '').trim();

    if (!searchTerm) {
        return "Por favor, escribe un término para buscar en Wikipedia. Ejemplo: `!wiki Chile`";
    }

    try {
        await message.react('⏳');
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
            await message.react('❌');
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
        
        // Intentar obtener la imagen del primer resultado para enviarla con el texto
        try {
            const firstTitle = response.data.query.search[0].title;
            const imageResponse = await axios.get('https://es.wikipedia.org/w/api.php', {
                params: {
                    action: 'query',
                    prop: 'pageimages',
                    titles: firstTitle,
                    pithumbsize: 600, // Tamaño de la imagen
                    format: 'json'
                }
            });

            const pages = imageResponse.data.query.pages;
            const pageId = Object.keys(pages)[0];
            
            if (pages[pageId].thumbnail && pages[pageId].thumbnail.source) {
                const media = await MessageMedia.fromUrl(pages[pageId].thumbnail.source);
                await message.reply(media, undefined, { caption: replyMessage });
                await message.react('✅');
                return null; // Retornamos null para que command.handler no envíe el texto duplicado
            }
        } catch (imgError) {
            console.error('Error al obtener imagen de Wikipedia:', imgError);
        }

        await message.react('✅');
        return replyMessage;

    } catch (error) {
        console.error('Error en la búsqueda de Wikipedia:', error);
        await message.react('❌');
        return 'Ocurrió un error al buscar en Wikipedia.';
    }
}

async function handleNews(message) {
    try {
        await message.react('⏳');
        const response = await axios.get('http://chile.infoflow.cloud/p.php/infoflow2017/noticias-nacionales');
        const html = response.data;
        const $ = cheerio.load(html);

        let newsText = $('body').text().trim();
        newsText = newsText.replace(/editor-card/g, '');
        newsText = newsText.replace(/\n\s*\n/g, '\n\n');

        await message.react('📰');
        return "📰 *Noticias Nacionales - Última Hora:*\n\n" + newsText;
    } catch (error) {
        console.error('Error al obtener las noticias:', error);
        await message.react('❌');
        return 'Lo siento, no pude obtener las noticias en este momento.';
    }
}

async function handleGoogleSearch(message) {
    // 1. Extracción robusta con Regex
    const searchTerm = message.body.replace(/^([!/])g\s*/i, '').trim();

    if (!searchTerm) {
        return "Escribe algo para buscar en Google. Ejemplo: `!g gatitos`";
    }
    
    try {
        await message.react('⏳');
        const results = await GoogleIt({ query: searchTerm });
        
        // --- INICIO DE LA MEJORA ---
        // 1. Verificamos si la respuesta es válida y tiene resultados.
        if (!results || results.length === 0) {
            console.log("La librería google-it no devolvió resultados para:", searchTerm);
            await message.react('❌');
            return `No se encontraron resultados en Google para *"${searchTerm}"*.`;
        }
        // --- FIN DE LA MEJORA ---

        let response = `Resultados de Google para *"${searchTerm}"*:\n\n`;
        results.slice(0, 4).forEach((result, index) => {
            response += `*${index + 1}. ${result.title}*\n`;
            response += `_${result.snippet}_\n`;
            response += `${result.link}\n\n`;
        });
        await message.react('✅');
        return response;
    } catch (error) {
        console.error("Error en búsqueda de Google:", error);
        await message.react('❌');
        return "Hubo un error al buscar en Google.";
    }
}

// ─────────────────────────────────────────────
// BÚSQUEDA DE OFERTAS (SoloTodo + Knasta + Descuentos Rata)
// ─────────────────────────────────────────────
const { searchAllDeals, formatPrice } = require('../services/deals.service');

async function handleDealsSearch(message) {
    const searchTerm = message.body.replace(/^([!/])oferta\s*/i, '').trim();

    if (!searchTerm) {
        return '🛒 Escribe un producto para buscar ofertas. Ejemplo: `!oferta zapatillas nike`';
    }

    try {
        await message.react('⏳');

        const results = await searchAllDeals(searchTerm);

        if (!results || results.length === 0) {
            await message.react('❌');
            return `😕 No encontré ofertas para *"${searchTerm}"* en este momento. Intenta con otro término.`;
        }

        let msg = `🔍 Ofertas para *"${searchTerm}"*\n`;
        msg += `_(${results.length} resultado${results.length !== 1 ? 's' : ''}, ordenados por mayor descuento)_\n\n`;

        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

        results.forEach((p, i) => {
            const discountStr = p.descuento > 0 ? ` — *-${p.descuento}%* 🔥` : '';
            const precioStr   = formatPrice(p.precio);
            const anterior    = p.precioOriginal && p.precioOriginal > p.precio
                ? ` _(antes ${formatPrice(p.precioOriginal)})_`
                : '';

            msg += `${emojis[i] || `${i + 1}.`} *${p.nombre}*${discountStr}\n`;
            msg += `   💰 ${precioStr}${anterior}\n`;
            msg += `   🏪 ${p.tienda} | ${p.fuente}\n`;
            msg += `   🔗 ${p.url}\n\n`;
        });

        await message.react('✅');
        return msg.trim();

    } catch (err) {
        console.error('[handleDealsSearch] Error:', err.message);
        await message.react('❌');
        return 'Ocurrió un error al buscar ofertas. Intenta nuevamente.';
    }
}

module.exports = {
    handleWikiSearch,
    handleNews,
    handleGoogleSearch,
    handleDealsSearch
};