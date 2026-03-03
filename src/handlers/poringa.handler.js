"use strict";

const path = require('path');
const https = require('https');
const http  = require('http');
const { buscarPostsEnWeb } = require(path.join(__dirname, '..', '..', 'scraper.js'));

const PORINGA_HEADERS = {
    'Referer': 'https://www.poringa.net/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
};

/**
 * Descarga una imagen como Buffer con los headers correctos para poringa.net
 */
function descargarImagen(url, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        if (maxRedirects === 0) return reject(new Error('Demasiadas redirecciones'));
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, { headers: PORINGA_HEADERS }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return descargarImagen(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            const contentType = res.headers['content-type'] || 'image/jpeg';
            if (!contentType.startsWith('image/')) return reject(new Error(`Tipo no imagen: ${contentType}`));
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType }));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

/**
 * !poringa <búsqueda>
 * Muestra hasta 10 posts reales con thumbnail + link. Sin ads.
 */
async function handlePoringaSearch(client, message) {
    const searchTerm = message.body.replace(/^([!/])poringa/i, '').trim();

    if (!searchTerm) {
        await message.reply('Por favor ingresa un término de búsqueda. Ejemplo: `!poringa gatos`');
        try { await message.react('❌'); } catch (e) {}
        return;
    }

    try { await message.react('⏳'); } catch (e) {}

    try {
        await message.reply(`🔍 Buscando posts de *"${searchTerm}"* en Poringa...`);

        const posts = await buscarPostsEnWeb(searchTerm, 10);

        if (!posts || posts.length === 0) {
            await message.reply(`😕 No se encontraron posts para *"${searchTerm}"*.`);
            try { await message.react('❌'); } catch (e) {}
            return;
        }

        const chatId = message.from;

        await message.reply(
            `✅ Encontré *${posts.length} posts* para *"${searchTerm}"*:\n` +
            `Envía \`!ppost <url>\` para descargar todas las imágenes de un post.`
        );

        // Enviar cada post: thumbnail + título + link
        for (const post of posts) {
            const caption = `📌 *${post.titulo}*\n🔗 ${post.postUrl}`;

            if (post.thumbnail) {
                try {
                    const { buffer } = await descargarImagen(post.thumbnail);
                    await client.sendPhoto(chatId, buffer, {
                        caption,
                        parse_mode: 'Markdown'
                    });
                    continue;
                } catch (e) {
                    console.warn(`[Poringa] No se pudo descargar thumbnail: ${e.message}`);
                }
            }

            // Si no hay thumbnail o falló, enviar solo el texto
            await client.sendMessage(chatId, caption, { parse_mode: 'Markdown' });
        }

        try { await message.react('✅'); } catch (e) {}

    } catch (error) {
        console.error('[Poringa] Error en la búsqueda:', error);
        await message.reply('⚠️ Hubo un error al buscar en Poringa. Intenta más tarde.');
        try { await message.react('❌'); } catch (e) {}
    }
}

module.exports = { handlePoringaSearch, descargarImagen };
