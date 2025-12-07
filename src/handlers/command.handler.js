// src/handlers/command.handler.js (VERSIÓN FINAL Y 100% LIMPIA)
"use strict";

const { MessageMedia } = require('whatsapp-web.js');

// --- Importaciones de Servicios (Python) ---
const metroService = require('../services/metro.service');
const nationalTeamService = require('../services/nationalTeam.service');
const economyService = require('../services/economy.service');
const horoscopeService = require('../services/horoscope.service');
const externalService = require('../services/external.service');;

// Forma correcta y limpia de importar las funciones que necesitamos
const { getMatchDaySummary, getLeagueTable, getLeagueUpcomingMatches } = require('../services/league.service.js');
const { getChampionsMatches, getChampionsStandings } = require('../services/champions.service.js');

const { getTransbankStatus } = require('../services/transbank.service.js');
// --- Importaciones de Manejadores (Handlers) ---
const { handlePing } = require('./system.handler');
const { handleFeriados, handleFarmacias, handleClima, handleSismos, handleBus, handleSec, handleMenu, handleRandom } = require('./utility.handler');
const { handleSticker, handleSound, getSoundCommands, handleAudioList, handleJoke, handleCountdown, handleBotMention, handleOnce } = require('./fun.handler');
const { handleWikiSearch, handleNews, handleGoogleSearch } = require('./search.handler'); // Corregido: handleGoogleSearch no estaba en tu lista original pero sí en el switch
const { handleTicket, handleCaso } = require('./stateful.handler');
const { handleAiHelp } = require('./ai.handler');
const { handlePhoneSearch, handleTneSearch, handlePatenteSearch } = require('./personalsearch.handler');
const { handleNetworkQuery, handleNicClSearch } = require('./network.handler');
const { handleReaction } = require('../services/messaging.service');
// const { summarizeUrl } = require('../services/url-summarizer.service'); // ELIMINADO
const rateLimiter = require('../services/rate-limiter.service');
// --- Lógica Principal ---
const soundCommands = getSoundCommands();
const countdownCommands = ['18', 'navidad', 'añonuevo'];

// --- Cooldowns para comandos específicos ---
let lastTransbankRequestTimestamp = 0;
const TRANSBANK_COOLDOWN_SECONDS = 30; // 30 segundos de espera para !transbank


// --- ¡NUEVO! Lista de todos los comandos válidos ---
const validCommands = new Set([
    ...soundCommands, ...countdownCommands,
    'tabla', 'ligatabla', 'prox', 'ligapartidos', 'partidos', 'metro',
    'tclasi', 'selecciontabla', 'clasi', 'seleccionpartidos', 'valores',
    'horoscopo', 'bencina', 'trstatus', 'bolsa', 'ping', 'feriados',
    'far', 'clima', 'sismos', 'bus', 'sec', 'secrm', 'menu', 'comandos',
    'wiki', 'noticias', 'g', 'pat', 'patente', 's', 'audios', 'sonidos',
    'chiste', 'ticket', 'ticketr', 'tickete', 'caso', 'ecaso', 'icaso', 'transbank',
    'ayuda', 'num', 'tel', 'tne', 'pase', 'whois', 'net', 'nic', 'id',
    'random', 'dato', 'curiosidad', 'toimg', 'champion', 'tchampion'
]); 

async function commandHandler(client, message) {
    const body = message.body.trim(); // Usamos el cuerpo original sin convertir a minúsculas todavía.
    
    // La detección de menciones puede seguir usando el texto en minúsculas.
    const lowerBody = body.toLowerCase();
    if (/\b(bot|boot|bott|bbot)\b/.test(lowerBody)) {
        return handleBotMention(client, message);
    }
    if (/\b(once|onse|11)\b/.test(lowerBody)) {
        return handleOnce(client, message);
    }

    // --- ¡NUEVA LÓGICA DE DETECCIÓN DE COMANDOS! ---
    // Buscamos un comando válido en cualquier parte del mensaje.
    let command = null;
    const words = body.split(/\s+/); // Dividimos el mensaje en palabras

    for (const word of words) {
        // Limpiamos la palabra de posibles signos de puntuación al final
        const cleanWord = word.toLowerCase().replace(/[.,!?¡¿:;]$/, '');
        if (cleanWord.startsWith('!') || cleanWord.startsWith('/')) {
            const potentialCommand = cleanWord.substring(1);
            if (validCommands.has(potentialCommand)) {
                command = potentialCommand;
                break; // Encontramos el primer comando válido y salimos del bucle.
            }
        }
    }

    // Si no se encontró ningún comando válido, no hacemos nada.
    if (!command) return;

    let replyMessage;

    // Los comandos de sonido tienen su propia lógica de reacción, así que los manejamos primero.
    if (soundCommands.includes(command)) {
        console.log(`(Handler) -> Comando de sonido recibido: "${command}"`);
        return handleSound(client, message, command);
    }

    try {
        // Envolvemos la ejecución del comando en el manejador de reacciones.
        await handleReaction(message, (async () => {
            console.log(`(Handler) -> Comando recibido: "${command}"`);

            if (countdownCommands.includes(command)) {
                replyMessage = handleCountdown(command);
                await message.reply(replyMessage);
                return;
            }

            switch (command) {
                case 'tabla':
                case 'ligatabla':
                    replyMessage = await getLeagueTable();
                    break;
                case 'prox':
                case 'ligapartidos':
                    replyMessage = await getLeagueUpcomingMatches();
                    break;
                case 'partidos':
                    replyMessage = await getMatchDaySummary();
                    break;
                case 'champion':
                    replyMessage = await getChampionsMatches();
                    break;
                case 'tchampion':
                    replyMessage = await getChampionsStandings();
                    break;
                case 'metro':
                    // El servicio ya devuelve el mensaje completo con formato
                    replyMessage = await metroService.getMetroStatus();
                    break;
                case 'tclasi': case 'selecciontabla': replyMessage = await nationalTeamService.getQualifiersTable(); break;
                case 'clasi': case 'seleccionpartidos': replyMessage = await nationalTeamService.getQualifiersMatches(); break;
                case 'valores': replyMessage = await economyService.getEconomicIndicators(); break;
                case 'horoscopo':
                    const signo = message.body.split(' ')[1];
                    if (!signo) {
                        replyMessage = "Por favor, escribe un signo. Ej: `!horoscopo aries`";
                    } else {
                        const horoscopeResult = await horoscopeService.getHoroscope(signo);
                        await message.reply(horoscopeResult.text);
                        if (horoscopeResult.imagePath) {
                            const media = MessageMedia.fromFilePath(horoscopeResult.imagePath);
                            await client.sendMessage(message.from, media);
                        }
                    }
                    break;
                case 'bencina':
                    const comuna = message.body.split(' ')[1];
                    replyMessage = await externalService.getBencinaData(comuna);
                    break;
                case 'trstatus':
                    replyMessage = await externalService.getTraductorStatus();
                    break;
                case 'bolsa':
                    replyMessage = await externalService.getBolsaData();
                    break;
                case 'transbank':
                    const now = Date.now();
                    const timeSinceLastRequest = (now - lastTransbankRequestTimestamp) / 1000;

                    if (timeSinceLastRequest < TRANSBANK_COOLDOWN_SECONDS) {
                        const timeLeft = Math.ceil(TRANSBANK_COOLDOWN_SECONDS - timeSinceLastRequest);
                        replyMessage = `⏳ El comando !transbank está en cooldown. Por favor, espera ${timeLeft} segundos.`;
                    } else {
                        replyMessage = await getTransbankStatus();
                        lastTransbankRequestTimestamp = Date.now(); // Actualizamos el timestamp
                    }
                    break;
                case 'ping': replyMessage = await handlePing(message); break;
                case 'feriados': replyMessage = await handleFeriados(); break;
                case 'far': replyMessage = await handleFarmacias(message); break;
                case 'clima': replyMessage = await handleClima(message); break;
                case 'sismos': replyMessage = await handleSismos(); break;
                case 'bus': await handleBus(message, client); break;
                case 'sec': case 'secrm': replyMessage = await handleSec(message); break;
                case 'menu': case 'comandos': replyMessage = handleMenu(); break;
                case 'wiki': replyMessage = await handleWikiSearch(message); break;
                case 'noticias': replyMessage = await handleNews(message); break;
                case 'g': replyMessage = await handleGoogleSearch(message); break;
                case 'pat': case 'patente': await handlePatenteSearch(message); break;
                case 's': await handleSticker(client, message); break;
                case 'audios': case 'sonidos': replyMessage = handleAudioList(); break;
                case 'chiste': await handleJoke(client, message); break;
                case 'ticket': case 'ticketr': case 'tickete': replyMessage = handleTicket(message); break;
                case 'caso': case 'ecaso': case 'icaso': replyMessage = await handleCaso(message); break;
                case 'ayuda': replyMessage = await handleAiHelp(message); break;
                case 'num': case 'tel': await handlePhoneSearch(client, message); break;
                case 'tne': case 'pase': await handleTneSearch(message); break;
                case 'whois': case 'net': await handleNetworkQuery(message); break;
                case 'nic': await handleNicClSearch(message); break;
                case 'id':
                    console.log('ID de este chat:', message.from);
                    message.reply(`ℹ️ El ID de este chat es:\n${message.from}`);
                    break;
                case 'random': case 'dato': case 'curiosidad': 
                    const randomData = await handleRandom();
                    if (randomData.type === 'image' && randomData.media_url) {
                        try {
                            const media = await MessageMedia.fromUrl(randomData.media_url);
                            await client.sendMessage(message.from, media, { caption: randomData.caption });
                        } catch (err) {
                            console.error("Error al enviar imagen random:", err);
                            await message.reply(randomData.caption + "\n\n(No pude cargar la imagen 😢)");
                        }
                    } else {
                        replyMessage = randomData.caption;
                    }
                    break;
                case 'toimg':
                    if (!message.hasQuotedMsg) {
                        replyMessage = 'Debes responder a un sticker para convertirlo en imagen.';
                        break;
                    }
                    const quotedMsg = await message.getQuotedMessage();
                    if (quotedMsg.hasMedia && quotedMsg.type === 'sticker') {
                        const stickerMedia = await quotedMsg.downloadMedia();
                        // Al enviar el 'media' sin opciones de sticker, se envía como imagen/video.
                        await client.sendMessage(message.from, stickerMedia, { 
                            caption: '¡Listo! Aquí tienes tu sticker como imagen. ✨' 
                        });
                    } else {
                        replyMessage = 'El mensaje al que respondiste no es un sticker.';
                    }
                    break;
                /* ELIMINADO POR SOLICITUD DE USUARIO
                case 'resume':
                    // ... (Lógica eliminada)
                    break;
                */
                default: break;
            }

            if (replyMessage) {
                await message.reply(replyMessage);
            }
        })());
    } catch (error) {
        console.error(`Error al procesar el comando "${command}":`, error);
        await message.reply(`Hubo un error al procesar el comando \`!${command}\`.`);
    }
}

module.exports = commandHandler;