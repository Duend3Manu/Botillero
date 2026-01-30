"use strict";

const { MessageMedia } = require('../adapters/wwebjs-adapter');
const apiService = require('../utils/apiService');

async function handlePhoneSearch(client, message) {
    // Limpiar el comando del mensaje
    const phoneNumber = message.body.replace(/^([!/])(tel|num)/gi, '').replace(/[^\x20-\x7E]/g, '').trim();

    if (!phoneNumber) {
        return message.reply(`⚠️ Por favor, ingresa un número de teléfono después del comando.`);
    }

    try {
        await message.react('⏳');

        // Usamos el servicio dedicado
        const result = await apiService.getPhoneData(phoneNumber);

        if (!result.error) {
            if (result.imageUrl) {
                try {
                    const media = await MessageMedia.fromUrl(result.imageUrl);
                    await client.sendMessage(message.from, media, { caption: result.data });
                } catch (err) {
                    console.error("Error al cargar imagen de teléfono:", err);
                    await client.sendMessage(message.from, result.data);
                }
            } else {
                await client.sendMessage(message.from, result.data);
            }
            await message.react('✅');
        } else {
            await message.reply(result.message || 'No se encontró información.');
            await message.react('❌');
        }
    } catch (error) {
        console.error("Error en handlePhoneSearch:", error);
        await message.reply(`⚠️ Hubo un error al consultar el número.`);
        await message.react('❌');
    }
}

async function handlePatenteSearch(message) {
    // 1. Extracción robusta con Regex (igual que en otros handlers)
    const patenteInput = message.body.replace(/^([!/])(pat|patente)/gi, '').trim();

    if (!patenteInput) {
        return message.reply("Debes ingresar una patente. Ejemplo: `!pat aabb12`");
    }

    // 2. Limpieza: Quitamos guiones, puntos y espacios, y pasamos a mayúsculas
    const cleanPatente = patenteInput.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    try {
        await message.react('⏳');
        
        // Usamos el servicio Node.js (más rápido que Python para esto)
        const result = await apiService.getPatenteDataFormatted(cleanPatente);
        
        if (result.error) {
            await message.reply(result.message);
            await message.react('❌');
        } else {
            await message.reply(result.data);
            await message.react('✅');
        }
    } catch (error) {
        console.error('Error en handlePatenteSearch:', error);
        await message.reply('Ocurrió un error al buscar la patente.');
        await message.react('❌');
    }
}

async function handleTneSearch(message) {
    return message.reply("⚠️ La consulta de TNE se encuentra en mantenimiento.");
}

module.exports = {
    handlePhoneSearch,
    handlePatenteSearch,
    handleTneSearch
};