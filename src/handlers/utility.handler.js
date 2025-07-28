// src/handlers/utility.handler.js
"use strict";

const axios = require('axios');
const moment = require('moment-timezone');
const puppeteer = require('puppeteer');
const config = require('../config');
const { generateWhatsAppMessage } = require('../utils/secService');

async function handleFeriados() {
    try {
        const response = await axios.get('https://www.feriadosapp.com/api/laws.json');
        const feriados = response.data.data;
        const today = moment();
        let replyMessage = '🥳 Próximos 5 feriados en Chile:\n\n';
        let count = 0;

        for (const feriado of feriados) {
            if (moment(feriado.date).isAfter(today) && count < 5) {
                const formattedDate = moment(feriado.date).format('dddd DD [de] MMMM');
                replyMessage += `- *${formattedDate}:* ${feriado.title}\n`;
                count++;
            }
        }
        return count > 0 ? replyMessage : 'No se encontraron próximos feriados por ahora.';
    } catch (error) {
        console.error('Error al obtener los feriados:', error.message);
        return 'Ocurrió un error al obtener los feriados.';
    }
}

async function handleFarmacias(message) {
    const city = message.body.toLowerCase().replace(/!far|\/far/g, '').trim();
    if (!city) {
        return 'Debes especificar una comuna. Por ejemplo: `!far santiago`';
    }

    try {
        const response = await axios.get('https://midas.minsal.cl/farmacia_v2/WS/getLocalesTurnos.php');
        const farmacias = response.data;
        const filteredFarmacias = farmacias.filter(f => f.comuna_nombre.toLowerCase().includes(city));

        if (filteredFarmacias.length === 0) {
            return `No se encontraron farmacias de turno en ${city}.`;
        }

        let replyMessage = `🏥 Farmacias de turno encontradas en *${city.charAt(0).toUpperCase() + city.slice(1)}*:\n\n`;
        filteredFarmacias.slice(0, 5).forEach(f => {
            replyMessage += `*${f.local_nombre}*\n`;
            replyMessage += `Dirección: ${f.local_direccion}\n`;
            replyMessage += `Horario: ${f.funcionamiento_hora_apertura} a ${f.funcionamiento_hora_cierre}\n\n`;
        });
        return replyMessage.trim();
    } catch (error) {
        console.error('Error al obtener las farmacias:', error.message);
        return 'Ocurrió un error al obtener las farmacias.';
    }
}

async function handleClima(message) {
    const city = message.body.substring(message.body.indexOf(' ') + 1).trim();
    if (!city) {
        return "Debes indicar una ciudad. Ejemplo: `!clima santiago`";
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
🌤️ *Clima en ${location.name}, ${location.region}*

- *Ahora:* ${current.temp_c}°C, ${current.condition.text}
- *Sensación Térmica:* ${current.feelslike_c}°C
- *Viento:* ${current.wind_kph} km/h
- *Humedad:* ${current.humidity}%

- *Máx/Mín hoy:* ${forecast.maxtemp_c}°C / ${forecast.mintemp_c}°C
- *Posibilidad de lluvia:* ${forecast.daily_chance_of_rain}%
        `.trim();
        return reply;
    } catch (error) {
        console.error("Error al obtener el clima de WeatherAPI:", error.response?.data?.error?.message || error.message);
        return `No pude encontrar el clima para "${city}".`;
    }
}

async function handleSismos() {
    try {
        const response = await axios.get('https://api.gael.cloud/general/public/sismos');
        let reply = '🌋 *Últimos 5 sismos en Chile:*\n\n';
        
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
        return "No pude obtener la información de los sismos.";
    }
}

async function handleBus(message, client) {
    const paradero = message.body.substring(message.body.indexOf(' ') + 1).trim().toUpperCase();
    if (!paradero) {
        return client.sendMessage(message.from, "Debes indicar el código del paradero. Ejemplo: `!bus PA433`");
    }

    await message.react('⏳');
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto(`https://www.red.cl/planifica-tu-viaje/cuando-llega/?codsimt=${paradero}`);
        
        await page.waitForSelector('.nombre-parada', { timeout: 15000 });
        const nombreParadero = await page.$eval('.nombre-parada', el => el.textContent.trim());

        let reply = `🚌 Próximas llegadas al paradero *${nombreParadero} (${paradero})*:\n\n`;
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
            return client.sendMessage(message.from, `No hay próximos servicios para el paradero *${paradero}*.`);
        }

        services.forEach(s => {
            reply += `*Servicio ${s.servicio}* (a ${s.destino})\n`;
            reply += `  - Próximo: ${s.llegadas[0]}\n`;
            reply += `  - Siguiente: ${s.llegadas[1]}\n\n`;
        });
        
        await browser.close();
        await message.react('✅');
        return client.sendMessage(message.from, reply.trim());

    } catch (error) {
        console.error("Error con Puppeteer en !bus:", error);
        if (browser) await browser.close();
        await message.react('❌');
        return client.sendMessage(message.from, `No se pudo obtener la información para el paradero *${paradero}*.`);
    }
}

// --- Lógica para !sec (CORREGIDA Y SIMPLIFICADA) ---
async function handleSec(message) {
    const command = message.body.toLowerCase().split(' ')[0];
    let region = null;

    // Si el comando es específicamente !secrm o /secrm, asignamos la región.
    if (command === '!secrm' || command === '/secrm') {
        region = 'Metropolitana';
    }
    
    // Si el comando es solo '!sec' o '/sec', la región queda como null y busca a nivel nacional.
    return generateWhatsAppMessage(region);
}

// --- Lógica para !menu (CORREGIDA) ---
function handleMenu() {
    return `
📜 *Comandos disponibles* 📜

🌤️ *Clima*
   \`!clima [ciudad]\`
    
💰 *Finanzas*
   \`!valores\`
    
🥳 *Feriados*
   \`!feriados\`, \`!18\`, \`!navidad\`
    
🏥 *Farmacias de Turno*
   \`!far [comuna]\`
    
⚽ *Fútbol Chileno*
   \`!tabla\` o \`!ligatabla\`
   \`!prox\` o \`!ligapartidos\`
    
🇨🇱 *Selección Chilena*
   \`!tclasi\` o \`!selecciontabla\`
   \`!clasi\` o \`!seleccionpartidos\`
    
� *Metro de Santiago*
   \`!metro\`
    
🔍 *Búsquedas*
   \`!pat [patente]\`
   \`!wiki [término]\`
   \`!g [término]\`
    
🤖 *Crear Sticker*
   Responde \`!s\` a una imagen/gif/video
    
🎵 *Audios*
   \`!audios\` o \`!sonidos\` para la lista
    
🌋 *Info Geográfica*
   \`!sismos\`
   \`!bus [código_paradero]\`
    
💡 *Suministro Eléctrico*
   \`!sec\` (Nacional) o \`!secrm\` (RM)
    
🇨🇱 *Otros*
   \`!ping\`
    `.trim();
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