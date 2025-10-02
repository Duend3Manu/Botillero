"use strict";

const puppeteer = require('puppeteer');
const axios = require('axios'); // Lo dejamos por si otras funciones lo usan
const FormData = require('form-data');
const { MessageMedia } = require('whatsapp-web.js');
const { safeReact } = require('../utils/reaction.util');
/**
 * Busca información de un número de teléfono usando la API de Celuzador.
 */
async function handlePhoneSearch(client, message) {
    const phoneNumber = message.body.replace(/^!tel|^!num/i, '').trim();

    if (!phoneNumber) {
        return message.reply('⚠️ Por favor, ingresa un número de teléfono después del comando. Ej: `!tel 56912345678`');
    }

    try {
        await safeReact(message, '⏳');

        let data = new FormData();
        data.append('tlfWA', phoneNumber);

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://celuzador.porsilapongo.cl/celuzadorApi.php',
            headers: { 
                'User-Agent': 'CeludeitorAPI-TuCulitoSacaLlamaAUFAUF', 
                ...data.getHeaders()
            },
            data: data
        };

        const response = await axios.request(config);

        if (response.data.estado === 'correcto') {
            await safeReact(message, '✅');
            const responseData = response.data.data;
            const urlMatch = responseData.match(/\*Link Foto\* : (https?:\/\/[^\s]+)/);

            if (urlMatch && urlMatch[1]) {
                const imageUrl = urlMatch[1];
                const media = await MessageMedia.fromUrl(imageUrl, { unsafeMime: true });
                await client.sendMessage(message.from, media, { caption: responseData });
            } else {
                await message.reply(responseData);
            }
        } else {
            await safeReact(message, '❌');
            await message.reply(response.data.data);
        }
    } catch (error) {
        console.error("Error en la función handlePhoneSearch:", error);
        await safeReact(message, '❌');
        await message.reply('⚠️ Hubo un error al consultar la API. Intenta nuevamente más tarde.');
    }
}

/**
 * Busca información de una patente de vehículo.
 */
async function handlePatenteSearch(message) {
    const patente = message.body.split(' ')[1];

    if (!patente) {
        return message.reply('Debes ingresar una patente. Ejemplo: `!pat XL3525`');
    }

    const url = `https://infoflow.cloud/patlite.php?pat=${patente}`;
    console.log(`(DEBUG) -> Consultando URL de patente: ${url}`);

    try {
        await safeReact(message, '🚗');

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'tuCulitoSacaLlama-SV'
            }
        });

        const data = response.data;

        if (data.valido === true) {
            await safeReact(message, '✅');
            const info = data.info.Respuesta;
            
            const replyMessage = `
✅ *Información de la Patente: ${info.plate}*

🚗 *Marca/Modelo:* ${info.brand} ${info.model} (${info.year})
🎨 *Color:* ${info.color}
📋 *Tipo:* ${info.typeDescription}

👤 *Propietario:* ${info.name}
🆔 *RUT:* ${info.numberOfIdentification}-${info.verifierDigit}

🔧 *N° Motor:* ${info.engine}
🔩 *N° Chasis:* ${info.chassis}
            `.trim();

            await message.reply(replyMessage);
        } else {
            await safeReact(message, '❌');
            await message.reply(`La patente *${data.patente}* no es válida o no se encontró.`);
        }
    } catch (error) {
        await safeReact(message, '❌');
        console.error("Error al buscar la patente:", error);
        await message.reply('Ocurrió un error al consultar el servicio de patentes. Intenta de nuevo.');
    }
}

// Exporta todas las funciones del módulo
module.exports = {
    handlePhoneSearch,
    handlePatenteSearch
};