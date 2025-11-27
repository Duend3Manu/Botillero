// src/handlers/utility.handler.js
"use strict";

const axios = require('axios');
const moment = require('moment-timezone');
const puppeteer = require('puppeteer');
const config = require('../config');
const { generateWhatsAppMessage } = require('../utils/secService');
const { getRandomInfo } = require('../services/utility.service');

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
        console.log(`(Farmacias) -> Buscando farmacias en: "${city}"`);
        
        // Intenta obtener farmacias desde la API del Minsal
        const response = await axios.get('https://midas.minsal.cl/farmacia_v2/WS/getLocalesTurnos.php');
        const farmacias = response.data;
        
        console.log(`(Farmacias) -> Total farmacias recibidas de API: ${farmacias.length}`);
       
        // Filtrar por comuna
        const filteredFarmacias = farmacias.filter(f => 
            f.comuna_nombre && f.comuna_nombre.toLowerCase().includes(city)
        );
        
        console.log(`(Farmacias) -> Farmacias filtradas: ${filteredFarmacias.length}`);

        if (filteredFarmacias.length > 0) {
            // Encontró farmacias en la API
            let replyMessage = `🏥 *Farmacias de turno en ${filteredFarmacias[0].comuna_nombre}*\n\n`;
            filteredFarmacias.slice(0, 5).forEach(f => {
                replyMessage += `*${f.local_nombre}*\n`;
                replyMessage += `📍 ${f.local_direccion}\n`;
                replyMessage += `🕐 ${f.funcionamiento_hora_apertura} - ${f.funcionamiento_hora_cierre}\n`;
                if (f.local_telefono) replyMessage += `📞 ${f.local_telefono}\n`;
                replyMessage += `\n`;
            });
            return replyMessage.trim();
        }
        
        // No encontró en API, ofrecer alternativas
        const comunasDisponibles = [...new Set(farmacias.map(f => f.comuna_nombre))];
        const algunasComunas = comunasDisponibles.slice(0, 8).join(', ');
        
        return `❌ No encontré farmacias de turno para "${city}" en la base de datos actual.\n\n💡 **Comunas disponibles en la API:**\n${algunasComunas}\n\n🌐 **Para otras comunas de Chile:**\nConsulta el sitio oficial del Minsal:\nhttps://seremienlinea.minsal.cl/asdigital/index.php?mfarmacias`;
        
    } catch (error) {
        console.error('(Farmacias) -> Error:', error.message);
        return '❌ No pude obtener información de farmacias en este momento.\n\n🌐 Puedes consultar directamente en:\nhttps://seremienlinea.minsal.cl/asdigital/index.php?mfarmacias';
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
        return client.sendMessage(message.from, reply.trim());

    } catch (error) {
        console.error("Error con Puppeteer en !bus:", error);
        if (browser) await browser.close();
        throw new Error(`No se pudo obtener la información para el paradero *${paradero}*.`);
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

async function handleRandom() {
    try {
        return await getRandomInfo();
    } catch (error) {
        console.error('Error al obtener dato random:', error);
        return '🎲 Hubo un error al lanzar los dados de la información.';
    }
}

// --- Lógica para !menu (CORREGIDA) ---
function handleMenu() {
    return `
*🤖 Menú de Comandos de Botillero 🤖*

*⚙️ Servicios y Consultas*
  \`!clima [ciudad]\` - Revisa el tiempo.
  \`!valores\` - Indicadores económicos.
  \`!feriados\` - Próximos feriados en Chile.
  \`!far [comuna]\` - Farmacias de turno.
  \`!metro\` - Estado de la red de Metro.
  \`!sismos\` - Últimos sismos reportados.
  \`!bus [paradero]\` - Próximas llegadas de micros.
  \`!sec\` o \`!secrm\` - Cortes de luz a nivel nacional o RM.
  \`!bencina [comuna]\` - Precios de combustibles.
  \`!trstatus\` - Estado de los servicios de Transbank.
  \`!bolsa\` - Indicadores de la Bolsa de Santiago.

*🔍 Búsquedas e Información*
  \`!wiki [búsqueda]\` - Busca en Wikipedia.
  \`!g [búsqueda]\` - Busca en Google.
  \`!noticias\` - Titulares de última hora.
  \`!pat [patente]\` - Info de un vehículo.
  \`!num [número]\` - Busca info de un teléfono.
  \`!tne [rut]\` - Consulta el estado de la TNE.
  \`!random\` - Dato curioso, efeméride, chiste, etc.

*📡 Redes y Dominios*
  \`!whois [dominio/ip]\` - Realiza un Whois.
  \`!nic [dominio.cl]\` - Consulta dominios .cl.

*🤣 Entretenimiento y Humor*
  \`!s\` - Crea un sticker (responde a una imagen/video).
  \`!audios\` - Lista de comandos de audio.
  \`!chiste\` - Escucha un chiste en audio.
  \`!horoscopo [signo]\` - Tu horóscopo diario.
  \`!18\` - Cuenta regresiva para el 18.
  \`!navidad\` - Cuenta regresiva para Navidad.
  \`!añonuevo\` - Cuenta regresiva para Año Nuevo.

*⚽ Fútbol*
  \`!tabla\` - Tabla de posiciones del torneo nacional.
  \`!partidos\` - Resumen de la fecha actual.
  \`!prox\` - Próximos partidos del torneo.
  \`!tclasi\` - Tabla de las clasificatorias.
  \`!clasi\` - Próximos partidos de clasificatorias.

*🛠️ Utilidades del Bot*
  \`!ping\` - Revisa el estado del sistema del bot.
  \`!id\` - Muestra el ID de este chat.
  \`!ayuda [duda]\` - Te ayudo a encontrar un comando.
  \`!ticket\` - Lista todos los recordatorios.
  \`!caso [texto]\` - Registra un "caso aislado".
    `.trim();
}

module.exports = { 
    handleFeriados,
    handleFarmacias,
    handleClima,
    handleSismos,
    handleBus,
    handleSec,
    handleMenu,
    handleRandom
};