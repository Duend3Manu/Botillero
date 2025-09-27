// src/handlers/command.handler.js (VERSIÓN FINAL Y 100% LIMPIA)
"use strict";

const { MessageMedia } = require('whatsapp-web.js');

// --- Importaciones de Servicios (Python) ---
const metroService = require('../services/metro.service');
const nationalTeamService = require('../services/nationalTeam.service');
const economyService = require('../services/economy.service');
const horoscopeService = require('../services/horoscope.service');
const externalService = require('../services/external.service');
const messagingService = require('../services/messaging.service.js');

// Forma correcta y limpia de importar las funciones que necesitamos
const { getMatchDaySummary, getLeagueTable, getLeagueUpcomingMatches } = require('../services/league.service.js');

// --- Importaciones de Manejadores (Handlers) ---
const { handlePing } = require('./system.handler');
const { handleFeriados, handleFarmacias, handleClima, handleSismos, handleBus, handleSec, handleMenu } = require('./utility.handler');
const { handleSticker, handleSound, getSoundCommands, handleAudioList, handleJoke, handleCountdown, handleBotMention, handleOnce } = require('./fun.handler');
const { handleWikiSearch, handleNews, handleGoogleSearch } = require('./search.handler'); // Corregido: handleGoogleSearch no estaba en tu lista original pero sí en el switch
const { handleTicket, handleCaso } = require('./stateful.handler');
const { handleAiHelp } = require('./ai.handler');
const { handlePhoneSearch, handleTneSearch, handlePatenteSearch } = require('./personalsearch.handler');

// --- Lógica Principal ---
const soundCommands = getSoundCommands();
const countdownCommands = ['18', 'navidad', 'añonuevo'];

async function commandHandler(client, message) {
    const rawText = message.body.toLowerCase().trim();
    
    if (/\b(bot|boot|bott|bbot)\b/.test(rawText)) {
        return handleBotMention(client, message);
    }
    if (/\b(once|onse|11)\b/.test(rawText)) {
        return handleOnce(client, message);
    }

    if (!rawText.startsWith('!') && !rawText.startsWith('/')) {
        return;
    }

    const command = rawText.substring(1).split(' ')[0];
    let replyMessage;

    console.log(`(Handler) -> Comando recibido: "${command}"`);

    if (soundCommands.includes(command)) {
        return handleSound(client, message, command);
    }
    if (countdownCommands.includes(command)) {
        replyMessage = handleCountdown(command);
        return message.reply(replyMessage);
    }

    switch (command) {
case 'tabla':
        case 'ligatabla':
            messagingService.sendLoadingMessage(message); // Envía "cargando..."
            const table = await getLeagueTable();        // Espera el resultado
            client.sendMessage(message.from, table);     // Envía el resultado final
            break;
        case 'prox':
        case 'ligapartidos':
            messagingService.sendLoadingMessage(message);
            const prox = await getLeagueUpcomingMatches();
            client.sendMessage(message.from, prox);
            break;
        case 'partidos':
            messagingService.sendLoadingMessage(message);
            const partidos = await getMatchDaySummary();
            client.sendMessage(message.from, partidos);
            break;

        // --- Otros comandos lentos ---
        case 'metro':
            messagingService.sendLoadingMessage(message);
            const metroStatus = await metroService.getMetroStatus();
            client.sendMessage(message.from, metroStatus);
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
            return;
        
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

        // --- Handlers ---
        case 'ping': replyMessage = await handlePing(message); break;
        case 'feriados': replyMessage = await handleFeriados(); break;
        case 'far': replyMessage = await handleFarmacias(message); break;
        case 'clima': replyMessage = await handleClima(message); break;
        case 'sismos': replyMessage = await handleSismos(); break;
        case 'bus': return handleBus(message, client);
        case 'sec': case 'secrm': replyMessage = await handleSec(message); break;
        case 'menu': case 'comandos': replyMessage = handleMenu(); break;
        case 'wiki': replyMessage = await handleWikiSearch(message); break;
        case 'noticias': replyMessage = await handleNews(message); break;
        case 'g': replyMessage = await handleGoogleSearch(message); break;
        case 'pat': case 'patente': return handlePatenteSearch(message);
        case 's': return handleSticker(client, message);
        case 'audios': case 'sonidos': replyMessage = handleAudioList(); break;
        case 'chiste': return handleJoke(client, message);
        case 'ticket': case 'ticketr': case 'tickete': replyMessage = handleTicket(message); break;
        case 'caso': case 'ecaso': case 'icaso': replyMessage = await handleCaso(message); break;
        case 'ayuda': replyMessage = await handleAiHelp(message); break;
        case 'num': case 'tel': return handlePhoneSearch(client, message);
        case 'tne': case 'pase': return handleTneSearch(message);
        case 'id':
            console.log('ID de este chat:', message.from);
            message.reply(`ℹ️ El ID de este chat es:\n${message.from}`);
            break;
    
        default: break;
    }

    if (replyMessage) {
        message.reply(replyMessage);
    }
}

module.exports = commandHandler;