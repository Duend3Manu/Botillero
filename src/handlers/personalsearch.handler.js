// src/handlers/personalsearch.handler.js
"use strict";

const { MessageMedia } = require('whatsapp-web.js');
const { getPatenteDataFormatted, getRutData, getPhoneData } = require('../utils/apiService');

async function handlePatenteSearch(message) {
    const patente = message.body.replace(/!patente|!pat/i, '').trim();
    if (!patente || patente.length !== 6) {
        return message.reply(`🚨 El formato de la patente es inválido.\n\n*Usa:* \`!pat ABC123\`\nDebe tener *6 caracteres*, solo letras y números, sin espacios.`);
    }
    
    await message.react('⏳');
    const nombre = message._data.notifyName || 'amigo(a)';
    await message.reply(`¡Hola ${nombre}! 🚗 Estoy procesando tu consulta de patente *${patente.toUpperCase()}*...`);
    
    const result = await getPatenteDataFormatted(patente);
    await message.react(result.error ? '❌' : '✅');
    return message.reply(result.error ? result.message : result.data);
}

async function handleTneSearch(message) {
    const rutRegex = /([0-9]{1,9}-?[0-9kK])$/i;
    const matchRut = message.body.match(rutRegex);

    if (!matchRut) {
        return message.reply("Debes ingresar un RUT válido después del comando. Ejemplo: `!tne 12345678-9`");
    }
    
    const rut = matchRut[1];
    await message.react('⏳');
    await message.reply(`Estoy buscando información para el RUT *${rut.toUpperCase()}*...`);

    const result = await getRutData(rut);

    let responseText;
    if (result.error) {
        responseText = `⚠️ Error al buscar el RUT *${rut.toUpperCase()}*: ${result.message}`;
    } else {
        const userData = result.data;
        responseText = `
👤 *Datos de la TNE (RUT: ${rut.toUpperCase()})*:

📛 *Nombre Completo:* ${userData.primerNombre || 'No disponible'} ${userData.apellidoPaterno || 'No disponible'}
🔢 *Folio TNE:* ${userData.tneFolio || 'No disponible'}
🗓️ *Período TNE:* ${userData.tnePeriodo || 'No disponible'}
🎓 *Tipo de TNE:* ${userData.tneTipo || 'No disponible'}
✅ *Estado TNE:* ${userData.tneEstado || 'No disponible'}
📅 *Fecha de Solicitud:* ${userData.soliFech || 'No disponible'}
📝 *Estado de Solicitud:* ${userData.soliEstado || 'No disponible'}
ℹ️ *Observaciones:* ${userData.observaciones || 'No disponible'}
        `.trim();
    }
    
    return message.reply(responseText);
}

/**
 * --- ¡NUEVO Y CORREGIDO! ---
 * Maneja la búsqueda de información de un número de teléfono.
 * @param {import('whatsapp-web.js').Client} client - El objeto del cliente de WhatsApp.
 * @param {import('whatsapp-web.js').Message} message - El objeto del mensaje de WhatsApp.
 */
async function handlePhoneSearch(client, message) {
    const phoneNumber = message.body.replace(/!whois|!num|!tel/i, '').trim();
    if (!phoneNumber) {
        return message.reply("Debes ingresar un número de teléfono. Ejemplo: `!num 912345678`");
    }

    const result = await getPhoneData(phoneNumber);

    if (result.error) return message.reply(result.message);

    if (result.imageUrl) {
        const media = await MessageMedia.fromUrl(result.imageUrl);
        return client.sendMessage(message.from, media, { caption: result.data });
    }
    return message.reply(result.data);
}

module.exports = {
    handlePatenteSearch,
    handleTneSearch,
    handlePhoneSearch
};