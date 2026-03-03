"use strict";

const path = require('path');
const { descargarImagenesDePost } = require(path.join(__dirname, '..', '..', 'scraper.js'));
const { descargarImagen } = require('./poringa.handler');

const ALBUM_SIZE = 10;

/**
 * !ppost <url_del_post>
 * Descarga y envía TODAS las imágenes de un post de Poringa (sin límite).
 */
async function handlePpostSearch(client, message) {
    const postUrl = message.body.replace(/^([!/])ppost/i, '').trim();

    if (!postUrl || !postUrl.startsWith('http')) {
        await message.reply(
            '⚠️ Debes proporcionar la URL del post. Ejemplo:\n' +
            '`!ppost https://www.poringa.net/posts/imagenes/6271779/Vladislava-Shelygina.html`'
        );
        try { await message.react('❌'); } catch (e) {}
        return;
    }

    // Validar que sea una URL de poringa
    if (!postUrl.includes('poringa.net/posts/')) {
        await message.reply('⚠️ La URL debe ser de un post de Poringa (`poringa.net/posts/...`).');
        try { await message.react('❌'); } catch (e) {}
        return;
    }

    try { await message.react('⏳'); } catch (e) {}

    try {
        await message.reply(`📥 Accediendo al post y extrayendo imágenes... esto puede tardar.`);

        const items = await descargarImagenesDePost(postUrl);

        if (!items || items.length === 0) {
            await message.reply('😕 No se encontraron imágenes en ese post.');
            try { await message.react('❌'); } catch (e) {}
            return;
        }

        const imagenes = items.filter(i => i.tipo === 'imagen');
        const videos   = items.filter(i => i.tipo === 'video');
        const chatId   = message.from;

        await message.reply(
            `✅ Post cargado. Encontré *${items.length} medios*:\n` +
            `🖼️ Imágenes: ${imagenes.length} | 🎬 Videos: ${videos.length}\n\n` +
            `Descargando y enviando... ⬇️`
        );

        let enviadas = 0;
        let errores  = 0;

        // --- Imágenes en álbumes de hasta 10 ---
        for (let i = 0; i < imagenes.length; i += ALBUM_SIZE) {
            const chunk = imagenes.slice(i, i + ALBUM_SIZE);

            const descargadas = await Promise.all(
                chunk.map(async (item) => {
                    try {
                        const { buffer, contentType } = await descargarImagen(item.url);
                        return { buffer, contentType };
                    } catch (err) {
                        console.warn(`[Ppost] No se pudo descargar: ${item.url} → ${err.message}`);
                        return null;
                    }
                })
            );

            const validas = descargadas.filter(Boolean);

            if (validas.length === 0) {
                errores += chunk.length;
                continue;
            }

            if (validas.length > 1) {
                const mediaGroup = validas.map((img, idx) => ({
                    type: 'photo',
                    media: img.buffer,
                    caption: idx === 0 ? `📷 Álbum ${Math.floor(i / ALBUM_SIZE) + 1}` : undefined
                }));

                try {
                    await client.sendMediaGroup(chatId, mediaGroup);
                    enviadas += validas.length;
                } catch (albumErr) {
                    console.warn(`[Ppost] sendMediaGroup falló, enviando individualmente:`, albumErr.message);
                    for (const img of validas) {
                        try {
                            await client.sendPhoto(chatId, img.buffer);
                            enviadas++;
                        } catch (e) {
                            console.warn('[Ppost] sendPhoto falló:', e.message);
                            errores++;
                        }
                    }
                }
            } else {
                try {
                    await client.sendPhoto(chatId, validas[0].buffer);
                    enviadas++;
                } catch (e) {
                    errores++;
                }
            }

            // Pausa entre álbumes para no saturar la API
            if (i + ALBUM_SIZE < imagenes.length) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        // --- Videos individualmente ---
        for (const item of videos) {
            try {
                const { buffer } = await descargarImagen(item.url);
                await client.sendVideo(chatId, buffer);
                enviadas++;
            } catch (videoErr) {
                console.warn(`[Ppost] Error enviando video:`, videoErr.message);
                errores++;
            }
        }

        const resumen = `✅ Envío completo: *${enviadas} medios* enviados` +
                        (errores > 0 ? `, ${errores} no pudieron cargarse.` : '.');
        await message.reply(resumen);
        try { await message.react('✅'); } catch (e) {}

    } catch (error) {
        console.error('[Ppost] Error:', error);
        await message.reply('⚠️ Hubo un error al procesar el post. Intenta más tarde.');
        try { await message.react('❌'); } catch (e) {}
    }
}

module.exports = { handlePpostSearch };
