"use strict";

const pythonService = require('./python.service'); 
const axios = require('axios');
const moment = require('moment-timezone');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

/**
 * PRIORIDAD 1: Obtiene la última alerta desde la API del canal de WhatsApp.
 * @returns {Promise<{text: string, time: string}|{error: boolean}|null>}
 */
async function getLatestIncidentFromApi() {
    try {
        const apiUrl = 'https://consultappu-wahaapi.f7xnya.easypanel.host/api/messages?limit=1&ttl=120';
        const response = await axios.get(apiUrl, { timeout: 4000 });

        if (response.data && response.data.messages && response.data.messages.length > 0) {
            const lastMessage = response.data.messages[0];
            const messageDateUtc = moment.utc(lastMessage.dateUtc);
            const now = moment.utc();

            if (now.diff(messageDateUtc, 'hours') < 2) {
                const messageTimeLocal = moment(lastMessage.dateLocal).tz('America/Santiago').format('HH:mm');
                return {
                    source: 'Canal de Alertas',
                    text: lastMessage.text,
                    time: messageTimeLocal
                };
            }
        }
        return null;
    } catch (error) {
        console.error("API de alertas de WhatsApp no disponible:", error.message);
        return { error: true };
    }
}

/**
 * PRIORIDAD 2 (PLAN B): Obtiene el último mensaje del canal público de Telegram.
 * @returns {Promise<{text: string, time: string}|null>}
 */
async function getLatestIncidentFromTelegramChannel() {
    try {
        const telegramUrl = 'https://t.me/s/metrosantiagoalertas';
        const { data } = await axios.get(telegramUrl, { timeout: 4000 });
        const $ = cheerio.load(data);
        
        const lastMessage = $('.tgme_widget_message_wrap').last();
        if (lastMessage.length === 0) return null;

        const messageText = lastMessage.find('.tgme_widget_message_text').text().trim();
        const messageDateStr = lastMessage.find('time.time').attr('datetime');

        if (!messageText || !messageDateStr) return null;
        
        const messageDate = moment.utc(messageDateStr);
        const now = moment.utc();

        if (now.diff(messageDate, 'hours') < 2) {
            const messageTimeLocal = messageDate.tz('America/Santiago').format('HH:mm');
            return {
                source: 'Canal de Telegram',
                text: messageText,
                time: messageTimeLocal
            };
        }
        return null;
    } catch (error) {
        console.error("Error al obtener datos del canal de Telegram:", error.message);
        return null;
    }
}


/**
 * PRIORIDAD 3 (PLAN C): Obtiene el último tweet de la cuenta oficial de Metro.
 * @returns {Promise<{text: string, time: string}|null>}
 */
async function getLatestIncidentFromTwitter() {
    const nitterInstances = [
        'https://nitter.net',
        'https://nitter.cz',
        'https://nitter.poast.org',
        'https://nitter.privacydev.net'
    ];

    for (const instance of nitterInstances) {
        try {
            const twitterUrl = `${instance}/metrodesantiago`;
            console.log(`(Servicio Metro) -> Intentando con el mirror de Twitter: ${twitterUrl}`);
            const { data } = await axios.get(twitterUrl, { 
                timeout: 4000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);
            
            const firstTweet = $('.timeline-item').first();
            if (firstTweet.length === 0) continue;

            let tweetText = firstTweet.find('.tweet-content').text().trim();
            const tweetDateStr = firstTweet.find('.tweet-date a').attr('title');

            if (!tweetText || !tweetDateStr) continue;
            
            tweetText = tweetText.replace(/^Metro de Santiago/i, '').trim();
            
            const tweetDate = moment.utc(tweetDateStr, "MMM D, YYYY · h:mm A Z");
            const now = moment.utc();

            if (now.diff(tweetDate, 'hours') < 2) {
                const tweetTimeLocal = tweetDate.tz('America/Santiago').format('HH:mm');
                return {
                    source: 'Twitter Oficial',
                    text: tweetText,
                    time: tweetTimeLocal
                };
            }
        } catch (error) {
            console.error(`(Servicio Metro) -> Falló el mirror ${instance}: ${error.message}`);
        }
    }

    console.error("Error al obtener datos de Twitter: Todos los mirrors fallaron.");
    return null;
}

/**
 * Obtiene el estado completo de la red de Metro, probando múltiples fuentes de alertas.
 * @returns {Promise<{type: 'text'|'video', content?: string, path?: string, caption?: string}>}
 */
async function getMetroStatus() {
    try {
        let statusMessage = await pythonService.executeScript('metro.py');
        let latestIncident = await getLatestIncidentFromApi();

        if (!latestIncident || latestIncident.error) {
            console.log("(Servicio Metro) -> API de WhatsApp falló, intentando con Canal de Telegram...");
            latestIncident = await getLatestIncidentFromTelegramChannel();
        }

        if (!latestIncident) {
            console.log("(Servicio Metro) -> Canal de Telegram falló, intentando con Twitter como respaldo final...");
            latestIncident = await getLatestIncidentFromTwitter();
        }

        const isOk = statusMessage.includes("Toda la red se encuentra disponible");
        const videoPath = path.join(__dirname, '..', '..', 'mp3', 'metro.mp4');

        if (isOk && !latestIncident && fs.existsSync(videoPath)) {
            // Si todo está OK, no hay alertas y el video existe, enviamos el video.
            return {
                type: 'video',
                path: videoPath,
                caption: `✅ *¡Buenas noticias!* ✅\n\n${statusMessage}`
            };
        } else {
            // Si hay un problema o una alerta, construimos el mensaje de texto.
            if (latestIncident) {
                statusMessage += `\n\n--------------------\n`;
                statusMessage += `🚨 *ÚLTIMA ALERTA (${latestIncident.source} - ${latestIncident.time} hrs):*\n\n`;
                statusMessage += latestIncident.text;
            }
            return {
                type: 'text',
                content: statusMessage
            };
        }

    } catch (error) {
        console.error("Error al obtener el estado del Metro:", error);
        return { 
            type: 'text', 
            content: "No se pudo obtener el estado del Metro en este momento." 
        };
    }
}

module.exports = { getMetroStatus };

