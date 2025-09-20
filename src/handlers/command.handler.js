"use strict";

// --- Importaciones de todos los Servicios y Handlers necesarios ---
const economyService = require('../services/economy.service');
const leagueService = require('../services/league.service.js');
const metroService = require('../services/metro.service');
const nationalTeamService = require('../services/nationalTeam.service');
const horoscopeService = require('../services/horoscope.service');
const externalService = require('../services/external.service');
const utilityService = require('../services/utility.service.js');
const pythonService = require('../services/python.service');

const { handlePing } = require('./system.handler.js');
const { handleMenu, handleClima, handleSismos, handleFeriados, handleFarmacias, handleSec, handleBus } = require('./utility.handler.js');
const { 
    handleSticker, handleStickerToMedia, handleSound, getSoundCommands, 
    handleAudioList, handleJoke, handleCountdown, handleBotMention, 
    handleOnce
} = require('./fun.handler');
const { handleWikiSearch, handleNews, handleGoogleSearch } = require('./search.handler');
const { handleTicket, handleCaso } = require('./stateful.handler');
const { handleAiHelp } = require('./ai.handler');
const { handlePatenteSearch, handleTneSearch, handlePhoneSearch } = require('./personalsearch.handler.js');
const { handleNetworkQuery } = require('./network.handler.js');
const { handleBanner } = require('./banner.handler.js');


// --- Utilidades ---
const soundCommands = getSoundCommands();
const countdownCommands = ['18', 'navidad', 'añonuevo'];

/**
 * callHandler: invoca un handler intentando ambas firmas posibles:
 *  - handler(message)
 *  - handler(client, message)
 * Si el handler no existe retorna undefined y propaga errores.
 */
async function callHandler(fn, client, message, ...extra) {
    if (typeof fn !== 'function') return undefined;
    try {
        if (fn.length >= 2) {
            return await fn(client, message, ...extra);
        }
        return await fn(message, ...extra);
    } catch (err) {
        throw err;
    }
}

async function commandHandler(client, message) {

    try {
        // Verificación de seguridad: si el mensaje no es válido o no tiene texto, lo ignoramos.
        if (!message || !message.text) {
            return;
        }

        const rawText = message.text.toLowerCase().trim();

        // --- Menciones y comandos especiales sin prefijo ---
        if (rawText.includes('bot')) return handleBotMention(client, message); // <-- CAMBIO 2: Se pasa 'client'
        if (rawText.includes('once') || rawText.includes('11')) return handleOnce(client, message); // <-- CAMBIO 3: Se pasa 'client'

        // Ignoramos mensajes que no son comandos con prefijo
        if (!rawText.startsWith('!') && !rawText.startsWith('/')) {
            return;
        }

        const command = rawText.substring(1).split(' ')[0];
        console.log(`(Handler) -> Comando recibido en ${message.platform}: "${command}"`);

        // --- Manejo de comandos de sonido ---
        // NOTA: La función 'handleSound' esperaba más parámetros de los que se pasaban.
        // Se ha ajustado para pasar el 'message' como el mensaje de comando y el objetivo de la reacción.
        if (soundCommands.includes(command)) {
            return handleSound(client, message, message, command); // <-- CAMBIO 4: Se ajusta la llamada
        }
        if (countdownCommands.includes(command)) {
            return message.reply(handleCountdown(command));
        }

        // --- Manejo del resto de comandos ---
        let replyMessage; // <-- CAMBIO 5: Se define replyMessage aquí
        switch (command) {
            // Comandos de Fútbol y Deportes
            case 'tabla': case 'ligatabla':
                await message.showLoading();
                return message.reply(await leagueService.getLeagueTable());
            case 'prox': case 'ligapartidos':
                await message.showLoading();
                return message.reply(await leagueService.getLeagueUpcomingMatches());
            case 'partidos':
                await message.showLoading();
                return message.reply(await leagueService.getMatchDaySummary());
            case 'tclasi': case 'selecciontabla':
                return message.reply(await nationalTeamService.getQualifiersTable());
            case 'clasi': case 'seleccionpartidos':
                return message.reply(await nationalTeamService.getQualifiersMatches());

            // Comandos de Servicios y APIs Externas
            case 'metro':
                await message.showLoading();
                const metroResult = await metroService.getMetroStatus();
                if (metroResult.type === 'video' && message.platform === 'whatsapp') {
                    return message.sendAnimation(metroResult.path, metroResult.caption);
                }
                return message.reply(metroResult.content);
            case 'random':
                await message.showLoading();
                const randomInfo = await utilityService.getRandomInfo();
                if (typeof randomInfo === 'object' && randomInfo.type === 'image') {
                    return message.sendImage(randomInfo.url, randomInfo.caption);
                }
                return message.reply(randomInfo);
            case 'valores':
                return message.reply(await economyService.getEconomicIndicators());
            case 'horoscopo':
                const signo = message.args[0];
                if (!signo) return message.reply("Por favor, escribe un signo. Ej: `!horoscopo aries`");
                const horoscopeResult = await horoscopeService.getHoroscope(signo);
                await message.reply(horoscopeResult.text);
                if (horoscopeResult.imagePath) {
                    await message.sendImage(horoscopeResult.imagePath);
                }
                return;
            case 'bencina':
                return message.reply(await externalService.getBencinaData(message.args[0]));
            case 'bolsa':
                return message.reply(await externalService.getBolsaData());
                
            // Comandos de Búsqueda Personal
            case 'tel': 
            case 'phone': {
                await message.showLoading();
                const number = message.args[0];

                if (!number) {
                    return message.reply('Debes proporcionar un número de teléfono para buscar. Ejemplo: `!tel +56912345678`');
                }

                try {
                    // Llama al servicio que ejecuta scripts de Python
                    const result = await pythonService.executeScript('phone_info.py', number);
                    
                    if (result.error) {
                        return message.reply(`Error al buscar la información: ${result.error}`);
                    }

                    // Formatea la respuesta
                    const replyText = [
                        `*ℹ️ Información del Número*`,
                        `*Número:* ${result.number}`,
                        `*País:* ${result.country}`,
                        `*Compañía (Carrier):* ${result.carrier}`,
                        `*Zona Horaria:* ${result.time_zones.join(', ')}`
                    ].join('\n');

                    await message.reply(replyText);

                } catch (error) {
                    console.error('Error en el comando !tel:', error);
                    await message.reply('Ocurrió un error al ejecutar el script de información del teléfono.');
                }
                break;
            }
            case 'pat': case 'patente': return handlePatenteSearch(message);
            case 'tne': return handleTneSearch(message);

            // Comandos de Red y Banners
            case 'net': case 'whois': case 'scan': return handleNetworkQuery(message);
            case 'banner': return handleBanner(message);

            // Comandos de Diversión
            case 's': return handleSticker(client, message);
            case 'toimg': case 'imagen': return handleStickerToMedia(client, message); // <-- CAMBIO 6: Se pasa 'client'
            case 'audios': case 'sonidos': return message.reply(handleAudioList());
            case 'chiste': return handleJoke(client, message); // <-- CAMBIO 9: Se pasa 'client'
            
            // Comandos de Búsqueda General
            case 'wiki': return message.reply(await handleWikiSearch(message));
            case 'noticias': return message.reply(await handleNews());
            case 'g': return message.reply(await handleGoogleSearch(message));
            
            // Comandos de Utilidad y Sistema
            case 'menu':
            case 'help':
                return message.reply(handleMenu());
            case 'ping':
                replyMessage = await callHandler(handlePing, client, message);
                break;
            case 'feriados':
                // intenta handler local si existe, sino el servicio
                if (typeof handleFeriados === 'function') {
                    replyMessage = await callHandler(handleFeriados, client, message);
                } else if (utilityService && typeof utilityService.getFeriados === 'function') {
                    replyMessage = await utilityService.getFeriados();
                } else {
                    console.warn('[command.handler] handleFeriados no encontrada; revisa exports');
                    replyMessage = 'Función feriados no disponible. Avísale al administrador.';
                }
                break;
            case 'far':
                replyMessage = await callHandler(handleFarmacias, client, message);
                break;
            case 'clima':
                replyMessage = await callHandler(handleClima, client, message);
                break;
            case 'sismos':
                replyMessage = await callHandler(handleSismos, client, message);
                break;
            case 'bus':
                // handleBus puede tener firma (client, message) o (message, client) - llamarlo directamente si implementado
                // intentamos callHandler y, si devuelve undefined, llamar legacy
                try {
                    const res = await callHandler(handleBus, client, message, client);
                    if (res !== undefined) return res;
                } catch (e) {
                    // si falla, intentar la firma legacy
                    try { return await handleBus(message, client); } catch (err) { throw err; }
                }
                break;
            case 'sec': case 'secrm':
                replyMessage = await callHandler(handleSec, client, message);
                break;
            
            // Comandos de Estado y Soporte
            case 'ticket': case 'ticketr': case 'tickete': return message.reply(handleTicket(message));
            case 'caso': case 'ecaso': case 'icaso': return message.reply(await handleCaso(message));
            case 'ayuda': return message.reply(await handleAiHelp(message));
            
            case 'id': return message.reply(`ℹ️ El ID de este chat es:
${message.chatId}`);

            default:
                break;
        }

        // Si se llegó aquí, significa que se encontró un handler y se ejecutó
        if (replyMessage) {
            return message.reply(replyMessage);
        }
    } catch (err) {
        console.error("[command.handler] Error inesperado:", err);
        message.reply("Ocurrió un error inesperado al procesar tu comando.");
    }
}

module.exports = commandHandler;