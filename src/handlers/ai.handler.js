// src/handlers/ai.handler.js
"use strict";

const axios = require('axios');
const cheerio = require('cheerio');
// --- Importamos servicios ---
const { findCommandWithAI, generateSummary } = require('../services/ai.service');
const rateLimiter = require('../services/rate-limiter.service');

async function scrapeWeb(url) {
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
            timeout: 10000 // Timeout de 10 segundos para evitar bloqueos
        });
        const $ = cheerio.load(data);

        // Limpieza básica
        $('script, style, nav, header, footer, iframe, .ads, .comments').remove();

        // Caso especial: YouTube (Solo metadatos por ahora)
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const title = $('meta[name="title"]').attr('content') || $('title').text();
            const desc = $('meta[name="description"]').attr('content') || '';
            return `CONTEXTO VIDEO YOUTUBE:\nTítulo: ${title}\nDescripción: ${desc}\n\n(Nota para la IA: Resume basándote en este título y descripción, indicando que es un video).`;
        }

        // Extraer texto de párrafos para artículos
        let text = '';
        $('article, p, h1, h2, h3, li').each((i, el) => {
            const t = $(el).text().trim();
            if (t.length > 20) text += t + '\n';
        });

        return text.substring(0, 20000); // Límite de caracteres para no saturar
    } catch (error) {
        console.error("Error scraping:", error.message);
        return null;
    }
}

async function handleAiHelp(message) {
    // Detectar si hay un espacio para separar el comando del texto
    const firstSpaceIndex = message.body.indexOf(' ');
    const userQuery = (firstSpaceIndex !== -1) 
        ? message.body.substring(firstSpaceIndex + 1).toLowerCase().trim() 
        : '';

    if (!userQuery || userQuery === 'ayuda' || userQuery === 'help') {
        return "¡Wena compa! Soy Botillero. Dime qué necesitas hacer y te ayudaré a encontrar el comando correcto. 🤖\n\nPor ejemplo: `!ayuda quiero saber el clima en valparaíso`";
    }

    // Verificación del cooldown global
    const limit = rateLimiter.tryAcquire();
    if (!limit.success) {
        return rateLimiter.getCooldownMessage(limit.timeLeft);
    }

    try {
        // Llamamos a la IA para que nos dé la respuesta
        const aiResponse = await findCommandWithAI(userQuery);
        return aiResponse;
    } catch (error) {
        console.error("Error al contactar la IA de Google:", error);
        return "Tuve un problema para conectarme con la IA, compa. Intenta de nuevo más tarde.";
    }
}

async function handleSummary(message) {
    // Buscar la primera URL válida en el mensaje usando Regex
    const urlMatch = message.body.match(/(https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[0] : null;
    
    if (!url) {
        return "Por favor, envía una URL válida después del comando. Ejemplo: `!resumen https://noticia.com/articulo`";
    }

    // Rate Limiter (Compartido con !ayuda para proteger la cuota)
    const limit = rateLimiter.tryAcquire();
    if (!limit.success) {
        return rateLimiter.getCooldownMessage(limit.timeLeft);
    }

    await message.react('👀'); // Reacción de "leyendo"

    try {
        const textContent = await scrapeWeb(url);
        let summary;
        
        // Si el scraper falla o es una app de JS muy pesada (TikTok, Insta, etc),
        // pedimos a Gemini que busque en la web directamente usando Grounding.
        if (!textContent || textContent.length < 50) {
            summary = await generateSummary(url, true);
        } else {
            summary = await generateSummary(textContent, false);
        }
        
        return `📝 *Resumen IA:*\n\n${summary}`;
    } catch (error) {
        await message.react('❌'); // Indicar error visualmente
        console.error("Error en handleSummary:", error);
        return "Ocurrió un error al intentar resumir el contenido.";
    }
}

module.exports = {
    handleAiHelp,
    handleSummary
};