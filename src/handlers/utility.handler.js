// src/handlers/utility.handler.js (Versión con menú actualizado)
"use strict";

const axios = require('axios');
const moment = require('moment-timezone');
const puppeteer = require('puppeteer');
const config = require('../config'); // Asumo que tienes este archivo de configuración
const { generateWhatsAppMessage } = require('../utils/secService'); // Asumo que tienes este servicio

// --- Lógica para !menu (ACTUALIZADA) ---
function handleMenu() {
    return `
🤖 *¡Wena! Soy Botillero, tu asistente.* 🤖

Aquí tení la lista actualizada de todas las weás que cacho hacer.
_Usa \`!\` o \`/\` pa' los comandos, da lo mismo._

---
*🎨 Edición de Imágenes (¡NUEVO!)*
---
*Comando:* \`!s\`
_Pa' qué sirve: Responde a una imagen/gif/video y te hago un sticker al toque._

*Comando:* \`!meme [texto arriba] - [texto abajo]\`
_Pa' qué sirve: Responde a una imagen pa' crear un meme clásico._

*Comando:* \`!banner [estilo] [texto]\`
_Pa' qué sirve: Crea un banner con el estilo de Shrek, Mario, etc._

*Comando:* \`!texto [texto arriba] - [texto abajo]\`
_Pa' qué sirve: Le pone texto semi-transparente a una imagen._

---
*⚙️ Pa'l Día a Día*
---
*Comando:* \`!clima [ciudad]\`
_Pa' qué sirve: Te tiro el pronóstico del tiempo._

*Comando:* \`!sismos\`
_Pa' qué sirve: Te sapeo los últimos 5 temblores._

*Comando:* \`!far [comuna]\`
_Pa' qué sirve: Te digo qué farmacia está de turno._

*Comando:* \`!metro\`
_Pa' qué sirve: Pa' cachar cómo anda el metro de Santiago._

*Comando:* \`!bus [código_paradero]\`
_Pa' qué sirve: Te digo en cuánto pasa la micro._

*Comando:* \`!sec\` o \`!secrm\`
_Pa' qué sirve: Pa' cachar si se cortó la luz._

*Comando:* \`!feriados\`
_Pa' qué sirve: Te muestra los próximos feriados._

---
*💰 Finanzas y Servicios*
---
*Comando:* \`!valores\`
_Pa' qué sirve: Te canto los indicadores económicos del día._

*Comando:* \`!bolsa\`
_Pa' qué sirve: Un resumen de cómo anda la bolsa._

*Comando:* \`!trstatus\`
_Pa' qué sirve: Revisa el estado de los servicios de Transbank._

---
*⚽ La Pelotita*
---
*Comando:* \`!tabla\`
_Pa' qué sirve: La tabla de posiciones de la liga chilena._

*Comando:* \`!prox\`
_Pa' qué sirve: Los próximos partidos de la fecha._

*Comando:* \`!partidos\`
_Pa' qué sirve: Un resumen de los partidos del día._

*Comando:* \`!tclasi\`
_Pa' qué sirve: Cómo va la Roja en las clasificatorias._

*Comando:* \`!clasi\`
_Pa' qué sirve: Los próximos partidos de la selección._

---
*🔍 Búsquedas y Consultas*
---
*Comando:* \`!pat [patente]\`
_Pa' qué sirve: Te busco los datos de un vehículo._

*Comando:* \`!tne [rut]\`
_Pa' qué sirve: Pa' cachar en qué está tu pase escolar._

*Comando:* \`!num [número]\`
_Pa' qué sirve: Te sapeo la info de un número de celular._

*Comando:* \`!wiki [búsqueda]\`
_Pa' qué sirve: Un resumen de Wikipedia._

*Comando:* \`!g [búsqueda]\`
_Pa' qué sirve: Una búsqueda en Google._

*Comando:* \`!resumen [URL]\`
_Pa' qué sirve: Te resume una noticia desde un enlace._

*Comando:* \`!net [dominio o IP]\`
_Pa' qué sirve: Te da un análisis completo de un sitio web._

---
*🎉 Diversión y Webeo*
---
*Comando:* \`!audios\`
_Pa' qué sirve: La lista de todos los audios pa' mandar la talla._

*Comando:* \`!chiste\`
_Pa' qué sirve: Te mando un chiste en audio._

*Comando:* \`!18\` o \`!navidad\`
_Pa' qué sirve: Pa' cachar cuánto falta pa'l manso carrete._

*Comando:* \`!ayuda [frase]\`
_Pa' qué sirve: Si andai perdido, tira ayuda y te oriento._

*Comando:* \`!ping\`
_Pa' qué sirve: Revisa el estado y la velocidad del bot._
    `.trim();
}

// --- OTRAS FUNCIONES DE UTILIDAD (SIN CAMBIOS) ---
async function handleFarmacias(message) {
    const city = message.body.toLowerCase().replace(/!far|\/far/g, '').trim();
    if (!city) {
        return 'Pone la comuna po, wn. Por ejemplo: `!far santiago`';
    }

    try {
        const response = await axios.get('https://midas.minsal.cl/farmacia_v2/WS/getLocalesTurnos.php');
        const farmacias = response.data;
        const filteredFarmacias = farmacias.filter(f => f.comuna_nombre.toLowerCase().includes(city));

        if (filteredFarmacias.length === 0) {
            return `No pillé farmacias de turno en ${city}, compa.`;
        }

        let replyMessage = `🏥 Estas son las farmacias de turno que pillé en *${city.charAt(0).toUpperCase() + city.slice(1)}*:\n\n`;
        filteredFarmacias.slice(0, 5).forEach(f => {
            replyMessage += `*${f.local_nombre}*\n`;
            replyMessage += `Dirección: ${f.local_direccion}\n`;
            replyMessage += `Horario: ${f.funcionamiento_hora_apertura} a ${f.funcionamiento_hora_cierre}\n\n`;
        });
        return replyMessage.trim();
    } catch (error) {
        console.error('Error al obtener las farmacias:', error.message);
        return 'Ucha, se cayó el sistema de las farmacias.';
    }
}

async function handleClima(message) {
    const city = message.body.substring(message.body.indexOf(' ') + 1).trim();
    if (!city) {
        return "Ya po, dime la ciudad. Ej: `!clima arica`";
    }

    try {
        const response = await axios.get('http://api.weatherapi.com/v1/forecast.json', {
            params: {
                key: config.weatherApiKey,
                q: city,
                days: 1,
                aqi: 'no',
                alerts: 'no',
                lang: 'es'
            }
        });

        const data = response.data;
        const current = data.current;
        const forecast = data.forecast.forecastday[0].day;
        const location = data.location;

        const reply = `
🌤️ *El tiempo en ${location.name}, ${location.region}*

- *Ahora mismo:* ${current.temp_c}°C, ${current.condition.text}
- *Se siente como:* ${current.feelslike_c}°C
- *Viento:* ${current.wind_kph} km/h
- *Humedad:* ${current.humidity}%

- *Hoy (Máx/Mín):* ${forecast.maxtemp_c}°C / ${forecast.mintemp_c}°C
- *¿Llueve?:* ${forecast.daily_chance_of_rain}% de prob.
        `.trim();
        return reply;
    } catch (error) {
        console.error("Error al obtener el clima de WeatherAPI:", error.response?.data?.error?.message || error.message);
        return `Ucha, no pillé el clima pa' "${city}", sorry.`;
    }
}

async function handleSismos() {
    try {
        const response = await axios.get('https://api.gael.cloud/general/public/sismos');
        let reply = '🌋 *Los últimos 5 temblores en Chilito:*\n\n';
        
        response.data.slice(0, 5).forEach(sismo => {
            const fecha = moment(sismo.Fecha).tz('America/Santiago').format('DD/MM/YYYY HH:mm');
            reply += `*Fecha:* ${fecha}\n`;
            reply += `*Lugar:* ${sismo.RefGeografica}\n`;
            reply += `*Magnitud:* ${sismo.Magnitud} ${sismo.Escala}\n`;
            reply += `*Profundidad:* ${sismo.Profundidad} km\n\n`;
        });
        return reply;
    } catch (error) {
        console.error("Error al obtener sismos:", error);
        return "No pude cachar los temblores, wn.";
    }
}

async function handleBus(message, client) {
    const paradero = message.body.substring(message.body.indexOf(' ') + 1).trim().toUpperCase();
    if (!paradero) {
        return client.sendMessage(message.from, "Tírame el código del paradero po. Ej: `!bus PA433`");
    }

    await message.react('⏳');
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto(`https://www.red.cl/planifica-tu-viaje/cuando-llega/?codsimt=${paradero}`);
        
        await page.waitForSelector('.nombre-parada', { timeout: 15000 });
        const nombreParadero = await page.$eval('.nombre-parada', el => el.textContent.trim());

        let reply = `🚌 *Paradero ${nombreParadero} (${paradero})*:\n\n`;
        const services = await page.$$eval('#tabla-servicios-paradero tbody tr', rows => 
            rows.map(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 3) return null;
                return {
                    servicio: cells[0].innerText,
                    destino: cells[1].innerText,
                    llegadas: [cells[2].innerText, cells[3].innerText]
                };
            }).filter(Boolean)
        );

        if (services.length === 0) {
            await browser.close();
            return client.sendMessage(message.from, `No viene ninguna micro pa'l paradero *${paradero}*.`);
        }

        services.forEach(s => {
            reply += `*Micro ${s.servicio}* (va pa' ${s.destino})\n`;
            reply += `  - Llega en: ${s.llegadas[0]}\n`;
            reply += `  - La siguiente: ${s.llegadas[1]}\n\n`;
        });
        
        await browser.close();
        await message.react('✅');
        return client.sendMessage(message.from, reply.trim());

    } catch (error) {
        console.error("Error con Puppeteer en !bus:", error);
        if (browser) await browser.close();
        await message.react('❌');
        return client.sendMessage(message.from, `No pude cachar la info del paradero *${paradero}*. A lo mejor pusiste mal el código.`);
    }
}

async function handleSec(message) {
    const command = message.body.toLowerCase().split(' ')[0];
    let region = null;
    if (command === '!secrm' || command === '/secrm') {
        region = 'Metropolitana';
    }
    return generateWhatsAppMessage(region);
}

module.exports = { 
    handleFeriados,
    handleFarmacias,
    handleClima,
    handleSismos,
    handleBus,
    handleSec,
    handleMenu
};