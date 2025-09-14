"use strict";

// --- Importaciones de todos los Servicios y Handlers necesarios ---
const economyService = require('../services/economy.service');
const leagueService = require('../services/league.service.js');
const metroService = require('../services/metro.service');
const nationalTeamService = require('../services/nationalTeam.service');
const externalService = require('../services/external.service');
const utilityService = require('../services/utility.service.js');

const { handlePing } = require('./system.handler.js');
const { handleMenu, handleClima, handleSismos, handleFeriados, handleFarmacias, handleSec, handleBus } = require('./utility.handler.js');
const { handleSticker, handleStickerToMedia, handleCountdown, } = require('./fun.handler');
const { handleWikiSearch, handleNews, handleGoogleSearch } = require('./search.handler');
const { handleAiHelp } = require('./ai.handler');
const { handlePatenteSearch, handleTneSearch, handlePhoneSearch } = require('./personalsearch.handler.js');
const { handleNetworkQuery } = require('./network.handler.js');
const { handleBanner } = require('./banner.handler.js');


// --- Utilidades ---
const soundCommands = getSoundCommands();
const countdownCommands = ['18', 'navidad', 'añonuevo'];

/**
 * --- ¡VERSIÓN FINAL, COMPLETA Y UNIVERSAL! ---
 * Manejador de comandos principal que centraliza toda la lógica del bot.
 * @param {object} message - El objeto de mensaje adaptado y universal.
 */
async function commandHandler(message) {
    // Verificación de seguridad: si el mensaje no es válido o no tiene texto, lo ignoramos.
    if (!message || !message.text) {
        return;
    }

    const rawText = message.text.toLowerCase().trim();

    const command = rawText.substring(1).split(' ')[0];
    console.log(`(Handler) -> Comando recibido en ${message.platform}: "${command}"`);

    try {
        // --- Manejo de comandos de sonido ---
        if (soundCommands.includes(command)) {
            return handleSound(message, command);
        }
        if (countdownCommands.includes(command)) {
            return message.reply(handleCountdown(command));
        }

        // --- Manejo del resto de comandos ---
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
                return message.reply(metroResult.content || metroResult);
            case 'random':
                await message.showLoading();
                const randomInfo = await utilityService.getRandomInfo();
                if (typeof randomInfo === 'object' && randomInfo.type === 'image') {
                    return message.sendImage(randomInfo.url, randomInfo.caption);
                }
                return message.reply(randomInfo);
            case 'valores':
                return message.reply(await economyService.getEconomicIndicators());
            case 'bencina':
                return message.reply(await externalService.getBencinaData(message.args[0]));
            case 'bolsa':
                return message.reply(await externalService.getBolsaData());
                
            // Comandos de Búsqueda Personal
            case 'tel': case 'num': return handlePhoneSearch(message);
            case 'pat': case 'patente': return handlePatenteSearch(message);

            // Comandos de Red y Banners
            case 'net': case 'whois': case 'scan': return handleNetworkQuery(message);
            case 'banner': return handleBanner(message);

            // Comandos de Diversión
            case 's': return handleSticker(message);
            case 'toimg': case 'imagen': return handleStickerToMedia(message);
            // Comandos de Búsqueda General
            case 'wiki': return message.reply(await handleWikiSearch(message));
            case 'noticias': return message.reply(await handleNews());
            case 'g': return message.reply(await handleGoogleSearch(message));
            
            // Comandos de Utilidad y Sistema
            case 'ping': return handlePing(message);
            case 'menu': case 'comandos': return message.reply(handleMenu());
            case 'clima': return message.reply(await handleClima(message));
            case 'sismos': return message.reply(await handleSismos());
            case 'feriados': return message.reply(await handleFeriados());
            case 'far': return message.reply(await handleFarmacias(message));
            case 'sec': case 'secrm': return message.reply(await handleSec(message));
            case 'bus': return handleBus(message);
            
            // Comandos de Estado y Soporte
            case 'ayuda': return message.reply(await handleAiHelp(message));
            
            case 'id': return message.reply(`ℹ️ El ID de este chat es:\n${message.chatId}`);

            default:
                break;
        }
    } catch (err) {
        console.error(`[command.handler] Error procesando '${command}':`, err);
        await message.reply("Ocurrió un error inesperado al procesar tu comando. 😔");
    }
}

module.exports = commandHandler;

