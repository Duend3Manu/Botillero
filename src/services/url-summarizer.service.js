/**
 * Servicio de Resumidor de URLs
 * Extrae contenido de URLs y genera resúmenes inteligentes con Gemini
 */
"use strict";

const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Extrae el texto principal de una página HTML
 * @param {string} html - El HTML de la página
 * @returns {string} Texto limpio
 */
function extractTextFromHtml(html) {
    const $ = cheerio.load(html);
    
    // Remover scripts, estilos y elementos innecesarios
    $('script, style, noscript, meta, link').remove();
    
    // Obtener el texto principal (artículos, párrafos, etc.)
    let text = $('article, main, [role="main"]').text();
    
    // Si no hay artículo principal, usar el body
    if (!text || text.trim().length < 100) {
        text = $('body').text();
    }
    
    // Limpiar espacios en blanco excesivos
    text = text.replace(/\s+/g, ' ').trim();
    
    // Limitar a 3000 caracteres para no sobrecargar la IA
    return text.substring(0, 3000);
}

/**
 * Obtiene el contenido de una URL
 * @param {string} url - La URL a procesar
 * @returns {Promise<{title: string, content: string, url: string}>}
 */
async function getUrlContent(url) {
    try {
        // Validar que sea una URL válida
        new URL(url); // Lanza error si no es válida
        
        // Usar timeout de 10 segundos
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            maxRedirects: 5
        });
        
        const html = response.data;
        const $ = cheerio.load(html);
        
        // Extraer título
        let title = $('meta[property="og:title"]').attr('content') || 
                   $('title').text() || 
                   url;
        
        // Extraer descripción
        let description = $('meta[property="og:description"]').attr('content') || 
                         $('meta[name="description"]').attr('content') || '';
        
        // Extraer contenido principal
        const content = extractTextFromHtml(html);
        
        return {
            title: title.substring(0, 200), // Limitar título
            description: description.substring(0, 500),
            content: content,
            url: url
        };
    } catch (error) {
        console.error('Error al obtener contenido de URL:', error.message);
        throw new Error(`No pude acceder a la URL: ${error.message}`);
    }
}

/**
 * Genera un resumen inteligente del contenido con Gemini
 * @param {string} title - Título de la página
 * @param {string} description - Descripción meta
 * @param {string} content - Contenido principal
 * @returns {Promise<string>} Resumen generado por IA
 */
async function generateSummary(title, description, content) {
    if (!process.env.GEMINI_API_KEY) {
        return "La API de IA no está configurada.";
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

        const prompt = `
Eres "Botillero", un asistente de chatbot para WhatsApp. Debes analizar el siguiente contenido de una página web y crear un resumen BREVE y DIRECTO en español.

**Título:** ${title}
**Descripción:** ${description}
**Contenido:** ${content}

Tu tarea:
1. Crea un resumen de máximo 3-4 líneas
2. Destaca los puntos más importantes
3. Usa lenguaje coloquial chileno ("wena", "compa", etc.)
4. Si es una noticia, di qué pasó y por qué importa
5. Si es un artículo, resume el tema principal
6. NO inventes información, solo resume lo que ves

Responde SOLO el resumen, sin explicaciones adicionales.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error al generar resumen:', error.message);
        throw new Error('No pude generar el resumen con IA');
    }
}

/**
 * Función principal: resumir una URL completa
 * @param {string} url - La URL a resumir
 * @returns {Promise<string>} Resumen formateado para WhatsApp
 */
async function summarizeUrl(url) {
    try {
        // Obtener contenido
        const { title, description, content } = await getUrlContent(url);
        
        // Generar resumen con IA
        const summary = await generateSummary(title, description, content);
        
        return `📄 *${title}*\n\n${summary}\n\n🔗 _${url}_`;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    summarizeUrl,
    getUrlContent,
    generateSummary
};
