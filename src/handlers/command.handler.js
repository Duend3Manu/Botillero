"use strict";

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { MessageMedia } = require('whatsapp-web.js');

// --- Importaciones de Servicios ---
const metroService = require('../services/metro.service');
const nationalTeamService = require('../services/nationalTeam.service');
const economyService = require('../services/economy.service');
const horoscopeService = require('../services/horoscope.service');
const externalService = require('../services/external.service');
const { getMatchDaySummary, getLeagueTable, getLeagueUpcomingMatches } = require('../services/league.service.js');
const pythonService = require('../services/python.service'); // Importamos el servicio de Python

// --- Importaciones de Manejadores (Handlers) ---
const { handlePing } = require('./system.handler');
const { handleFeriados, handleFarmacias, handleClima, handleSismos, handleBus, handleSec, handleMenu } = require('./utility.handler');
const { handleSticker, handleSound, getSoundCommands, handleAudioList, handleJoke, handleCountdown, handleBotMention, handleOnce } = require('./fun.handler');
const { handleWikiSearch, handleNews, handleGoogleSearch } = require('./search.handler'); // handlePatenteSearch se movió a personalsearch
const { handleTicket, handleCaso } = require('./stateful.handler');
const { handleAiHelp, handleSummarize } = require('./ai.handler'); // Corregido de handleAiChat a handleAiHelp
const { handleTagAll } = require('./group.handler');
const { handlePhoneSearch, handlePatenteSearch } = require('./personalsearch.handler');
const { handleWhoisAnalysis } = require('./network.handler.js');

// --- Lógica Principal ---
const soundCommands = getSoundCommands();
const countdownCommands = ['18', 'navidad', 'añonuevo'];

// Ahora recibe 'config' para saber qué comandos están habilitados
async function commandHandler(client, message, config) {
    const rawText = message.body.toLowerCase().trim();
    
    if (config.mentionTriggers) {
        if (/\b(bot|boot|bott|bbot)\b/.test(rawText)) { return handleBotMention(client, message); }
        if (rawText === 'once' || rawText === 'onse' || rawText === '11') { return handleOnce(client, message); }
    }
    
    if (!rawText.startsWith('!') && !rawText.startsWith('/')) { return; }

    const command = rawText.substring(1).split(' ')[0];
    let replyMessage;

    console.log(`(Handler) -> [${config.botName}] Comando recibido: "${command}"`);

    if (config.enabledFeatures.includes('sonidos') && soundCommands.includes(command)) {
        return handleSound(client, message, command);
    }
    if (config.enabledFeatures.includes('diversion') && countdownCommands.includes(command)) {
        replyMessage = handleCountdown(command);
        return message.reply(replyMessage);
    }

    switch (command) {
        // --- Característica: "futbol" ---
        case 'tabla': case 'ligatabla':
            if (config.enabledFeatures.includes('futbol')) {
                const table = await getLeagueTable();
                client.sendMessage(message.from, table);
            }
            break;
        case 'prox': case 'ligapartidos':
            if (config.enabledFeatures.includes('futbol')) {
                const prox = await getLeagueUpcomingMatches();
                client.sendMessage(message.from, prox);
            }
            break;
        case 'partidos':
            if (config.enabledFeatures.includes('futbol')) {
                const partidos = await getMatchDaySummary();
                client.sendMessage(message.from, partidos);
            }
            break;
        case 'tclasi': case 'selecciontabla': 
            if (config.enabledFeatures.includes('futbol')) {
                replyMessage = await nationalTeamService.getQualifiersTable(); 
            }
            break;
        case 'clasi': case 'seleccionpartidos': 
            if (config.enabledFeatures.includes('futbol')) {
                replyMessage = await nationalTeamService.getQualifiersMatches(); 
            }
            break;
        case 'mundial':
            if (config.enabledFeatures.includes('futbol')) {
                try {
                    console.log(`(Handler) -> Ejecutando script de mundial...`);
                    const { stdout } = await pythonService.executePythonScript('mundial.py');
                    replyMessage = stdout;
                } catch (error) {
                    console.error(`(Mundial Script) Error: ${error.message}`);
                    replyMessage = '❌ No se pudo obtener la información del mundial.';
                }
            }
            break;

        // --- Característica: "servicios" ---
        case 'metro':
            if (config.enabledFeatures.includes('servicios')) {
                const metroStatus = await metroService.getMetroStatus(message);
                client.sendMessage(message.from, metroStatus);
            }
            break;
        case 'valores': 
            if (config.enabledFeatures.includes('servicios')) {
                // La lógica para !valores estaba ausente, la he añadido usando el servicio existente.
                const indicators = await economyService.getEconomicIndicators();
                client.sendMessage(message.from, indicators);
                return; // Se envía directamente, no necesita message.reply
            }
            break;
        case 'horoscopo':
            if (config.enabledFeatures.includes('horoscopo')) { // Asumiendo que 'horoscopo' es una característica
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
            }
            return;
        case 'bencina':
            if (config.enabledFeatures.includes('servicios')) {
                const comuna = message.body.split(' ')[1];
                replyMessage = await externalService.getBencinaData(comuna);
            }
            break;
        case 'trstatus':
            if (config.enabledFeatures.includes('servicios')) {
                replyMessage = await externalService.getTransbankStatus();
            }
            break;
        case 'bolsa':
            if (config.enabledFeatures.includes('servicios')) {
                replyMessage = await externalService.getBolsaData();
            }
            break;
        case 'feriados': 
            if (config.enabledFeatures.includes('servicios')) {
                replyMessage = await handleFeriados(); 
            }
            break;
        case 'far': 
            if (config.enabledFeatures.includes('servicios')) {
                replyMessage = await handleFarmacias(message); 
            }
            break;
        case 'clima': 
            if (config.enabledFeatures.includes('servicios')) {
                replyMessage = await handleClima(message); 
            }
            break;
        case 'sismos': 
            if (config.enabledFeatures.includes('servicios')) {
                replyMessage = await handleSismos(); 
            }
            break;
        case 'bus': 
            if (config.enabledFeatures.includes('servicios')) {
                return handleBus(message, client);
            }
            break;
        case 'sec': case 'secrm': 
            if (config.enabledFeatures.includes('servicios')) {
                replyMessage = await handleSec(message); 
            }
            break;

        // --- Característica: "busquedas" ---
        case 'wiki': 
            if (config.enabledFeatures.includes('busquedas')) {
                replyMessage = await handleWikiSearch(message); 
            }
            break;
        case 'noticias': 
            if (config.enabledFeatures.includes('busquedas')) {
                replyMessage = await handleNews(message); 
            }
            break;
        case 'g': 
            if (config.enabledFeatures.includes('busquedas')) {
                replyMessage = await handleGoogleSearch(message); 
            }
            break;
        case 'pat': case 'patente': 
            if (config.enabledFeatures.includes('busquedas')) {
                return handlePatenteSearch(message);
            }
            break;
        case 'num': case 'tel': 
            if (config.enabledFeatures.includes('busquedas')) {
                return handlePhoneSearch(client, message);
            }
            break;
        case 'whois':
            if (config.enabledFeatures.includes('busquedas')) {
                return handleWhoisAnalysis(message);
            }
            break;

        // --- Característica: "ia" ---
        case 'ayuda': case 'ia': case 'pregunta':
            if (config.enabledFeatures.includes('ia')) { // Asumiendo que 'ia' es la característica
                replyMessage = await handleAiHelp(message); // Corregido para usar la función existente
            }
            break;
        case 'resumen':
            if (config.enabledFeatures.includes('ia')) { // Asumiendo que 'ia' es la característica
                return handleSummarize(message);
            }
            break;

        // --- Característica: "diversion" y "sonidos" ---
        case 's': 
            if (config.enabledFeatures.includes('diversion')) {
                return handleSticker(client, message); // La llamada a handleSticker estaba ausente
            }
            break;
        case 'chiste': 
            if (config.enabledFeatures.includes('diversion')) {
                return handleJoke(client, message);
            }
            break;
        case 'audios': case 'sonidos': 
            if (config.enabledFeatures.includes('sonidos')) {
                replyMessage = handleAudioList(); 
            }
            break;
            
        // --- Comandos Generales (sin característica específica) ---
        case 'ping': 
            replyMessage = await handlePing(message); 
            break;
        case 'menu': case 'comandos': 
            replyMessage = handleMenu(config);
            break;
        case 'id':
            console.log('ID de este chat:', message.from);
            message.reply(`ℹ️ El ID de este chat es:\n${message.from}`);
            break;
        case 'ticket': case 'ticketr': case 'tickete': 
            replyMessage = handleTicket(message); 
            break;
        case 'caso': case 'ecaso': case 'icaso': 
            replyMessage = await handleCaso(message); 
            break;
        case 'todos':
            return handleTagAll(client, message);
            break;
    
        default: 
            break;
    }

    if (replyMessage) {
        message.reply(replyMessage);
    }
}

module.exports = commandHandler;