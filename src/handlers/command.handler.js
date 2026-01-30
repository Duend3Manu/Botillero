// src/handlers/command.handler.js (VERSIÓN OPTIMIZADA)
"use strict";

const { MessageMedia } = require('../adapters/wwebjs-adapter');
const rateLimiter = require('../services/rate-limiter.service');
const { handleReaction } = require('../services/messaging.service');

// --- Lazy Loading de Servicios ---
// Los servicios solo se cargan cuando realmente se necesitan
const services = {
    get metro() { return require('../services/metro.service'); },
    get nationalTeam() { return require('../services/nationalTeam.service'); },
    get economy() { return require('../services/economy.service'); },
    get horoscope() { return require('../services/horoscope.service'); },
    get league() { return require('../services/league.service.js'); },
    get transbank() { return require('../services/transbank.service.js'); },
    get system() { return require('./system.handler'); },
    get utility() { return require('./utility.handler'); },
    get fun() { return require('./fun.handler'); },
    get search() { return require('./search.handler'); },
    get stateful() { return require('./stateful.handler'); },
    get ai() { return require('./ai.handler'); },
    get personalSearch() { return require('./personalsearch.handler'); },
    get network() { return require('./network.handler'); },
    get fap() { return require('./fap.handler'); },
    get group() { return require('./group.handler'); }
};

// --- Cooldowns para comandos específicos ---
let lastTransbankRequestTimestamp = 0;
const TRANSBANK_COOLDOWN_SECONDS = 30;

// --- Helpers para comandos con lógica repetida ---
async function handleHoroscopeCommand(client, message, serviceMethod) {
    const signo = message.body.split(' ')[1];
    if (!signo) {
        return "Por favor, escribe un signo. Ej: `!horoscopo aries`";
    }
    
    const result = await serviceMethod(signo);
    await message.reply(result.text);
    
    if (result.imagePath) {
        const media = MessageMedia.fromFilePath(result.imagePath);
        await client.sendMessage(message.from, media);
    }
    return null; // Ya enviamos la respuesta
}

async function handleTransbankWithCooldown() {
    const now = Date.now();
    const timeSinceLastRequest = (now - lastTransbankRequestTimestamp) / 1000;

    if (timeSinceLastRequest < TRANSBANK_COOLDOWN_SECONDS) {
        const timeLeft = Math.ceil(TRANSBANK_COOLDOWN_SECONDS - timeSinceLastRequest);
        return `⏳ El comando !transbank está en cooldown. Por favor, espera ${timeLeft} segundos.`;
    }
    
    const result = await services.transbank.getTransbankStatus();
    lastTransbankRequestTimestamp = Date.now();
    return result;
}

async function handleRandomCommand(client, message) {
    const randomData = await services.utility.handleRandom();
    
    if (randomData.type === 'image' && randomData.media_url) {
        try {
            const media = await MessageMedia.fromUrl(randomData.media_url);
            await client.sendMessage(message.from, media, { caption: randomData.caption });
        } catch (err) {
            console.error("Error al enviar imagen random:", err);
            await message.reply(randomData.caption + "\n\n(No pude cargar la imagen 😢)");
        }
        return null;
    }
    
    return randomData.caption;
}

async function handleStickerToImage(client, message) {
    if (!message.hasQuotedMsg) {
        return 'Debes responder a un sticker para convertirlo en imagen.';
    }
    
    const quotedMsg = await message.getQuotedMessage();
    if (quotedMsg.hasMedia && quotedMsg.type === 'sticker') {
        const stickerMedia = await quotedMsg.downloadMedia();
        await client.sendMessage(message.from, stickerMedia, { 
            caption: '¡Listo! Aquí tienes tu sticker como imagen. ✨' 
        });
        return null;
    }
    
    return 'El mensaje al que respondiste no es un sticker.';
}

// --- Mapa de Alias ---
const commandAliases = {
    'ligatabla': 'tabla',
    'ligapartidos': 'prox',
    'selecciontabla': 'tclasi',
    'seleccionpartidos': 'clasi',
    'ticketr': 'ticket',
    'tickete': 'ticket',
    'ecaso': 'caso',
    'icaso': 'caso',
    'tel': 'num',
    'patente': 'pat',
    'net': 'whois',
    'sonidos': 'audios',
    'comandos': 'menu',
    'secrm': 'sec',
    'dato': 'random',
    'curiosidad': 'random',
    'pase': 'tne'
};

// --- Command Map (Reemplaza el switch gigante) ---
const commandMap = {
    // Liga/Deportes
    'tabla': () => services.league.getLeagueTable(),
    'prox': () => services.league.getLeagueUpcomingMatches(),
    'partidos': () => services.league.getMatchDaySummary(),
    'tclasi': () => services.nationalTeam.getQualifiersTable(),
    'clasi': () => services.nationalTeam.getQualifiersMatches(),
    
    // Servicios públicos
    'metro': () => services.metro.getMetroStatus(),
    'valores': () => services.economy.getEconomicIndicators(),
    'horoscopo': (client, msg) => handleHoroscopeCommand(client, msg, services.horoscope.getHoroscope.bind(services.horoscope)),
    'chino': (client, msg) => handleHoroscopeCommand(client, msg, services.horoscope.getChineseHoroscope.bind(services.horoscope)),
    'trstatus': () => services.transbank.getTransbankStatus(),
    'transbank': () => handleTransbankWithCooldown(),
    'bancos': (_, msg) => services.utility.handleBancos(msg),
    
    // Sistema y utilidades
    'ping': (_, msg) => services.system.handlePing(msg),
    'feriados': (_, msg) => services.utility.handleFeriados(msg),
    'far': (_, msg) => services.utility.handleFarmacias(msg),
    'clima': (_, msg) => services.utility.handleClima(msg),
    'sismos': () => services.utility.handleSismos(),
    'bus': (client, msg) => services.utility.handleBus(msg, client),
    'sec': (_, msg) => services.utility.handleSec(msg),
    'menu': () => services.utility.handleMenu(),
    'recap': (_, msg) => services.utility.handleRecap(msg),
    
    // Búsquedas
    'wiki': (_, msg) => services.search.handleWikiSearch(msg),
    'noticias': (_, msg) => services.search.handleNews(msg),
    'g': (_, msg) => services.search.handleGoogleSearch(msg),
    'pat': (_, msg) => services.personalSearch.handlePatenteSearch(msg),
    'audios': () => services.fun.handleAudioList(),
    
    // Diversión
    'chiste': (client, msg) => services.fun.handleJoke(client, msg),
    's': (client, msg) => services.fun.handleSticker(client, msg),
    'random': (client, msg) => handleRandomCommand(client, msg),
    'toimg': (client, msg) => handleStickerToImage(client, msg),
    
    // Tickets y casos
    'ticket': (_, msg) => services.stateful.handleTicket(msg),
    'caso': (_, msg) => services.stateful.handleCaso(msg),
    
    // IA y ayuda
    'ayuda': (_, msg) => services.ai.handleAiHelp(msg),
    'resumen': (_, msg) => services.ai.handleSummary(msg),
    
    // Búsquedas personales
    'num': (client, msg) => services.personalSearch.handlePhoneSearch(client, msg),
    'tne': (_, msg) => services.personalSearch.handleTneSearch(msg),
    
    // Red
    'whois': (_, msg) => services.network.handleNetworkQuery(msg),
    'nic': (_, msg) => services.network.handleNicClSearch(msg),
    
    // FAP y grupos
    'fap': (client, msg) => services.fap.handleFapSearch(client, msg),
    'todos': (client, msg) => services.group.handleTagAll(client, msg),
    
    // ID del chat
    'id': (_, msg) => {
        console.log('ID de este chat:', msg.from);
        msg.reply(`ℹ️ El ID de este chat es:\n${msg.from}`);
        return null;
    }
};

// --- Lista de comandos válidos ---
const soundCommands = services.fun.getSoundCommands();
const countdownCommands = ['18', 'navidad', 'añonuevo'];

const validCommands = new Set([
    ...soundCommands, 
    ...countdownCommands,
    ...Object.keys(commandMap),
    ...Object.keys(commandAliases)
]);

// --- Regex Pre-compilada ---
const commandRegex = new RegExp(
    `([!/])(${[...validCommands].sort((a, b) => b.length - a.length).join('|')})\\b`, 
    'i'
);

// --- Handler Principal ---
async function commandHandler(client, message) {
    const body = message.body.trim();
    
    // Detectar comando usando regex optimizada
    let command = null;
    const match = body.match(commandRegex);

    if (match) {
        command = match[2].toLowerCase();
        
        // Normalizar el mensaje si el comando no está al principio
        if (match.index > 0) {
            message.body = message.body.substring(match.index);
        }
    }

    // Easter eggs (menciones al bot)
    if (!command) {
        const lowerBody = body.toLowerCase();
        if (/\b(bot|boot|bott|bbot)\b/.test(lowerBody)) {
            return services.fun.handleBotMention(client, message);
        }
        if (/\b(once|onse|11)\b/.test(lowerBody)) {
            return services.fun.handleOnce(client, message);
        }
        return;
    }

    // Comandos de sonido (tienen su propia lógica de reacción)
    if (soundCommands.includes(command)) {
        console.log(`(Handler) -> Comando de sonido recibido: "${command}"`);
        return services.fun.handleSound(client, message, command);
    }

    // Comandos de countdown
    if (countdownCommands.includes(command)) {
        const replyMessage = services.fun.handleCountdown(command);
        return message.reply(replyMessage);
    }

    // Resolver alias
    const resolvedCommand = commandAliases[command] || command;

    try {
        await handleReaction(message, (async () => {
            console.log(`(Handler) -> Comando recibido: "${command}"`);

            const handler = commandMap[resolvedCommand];
            
            if (!handler) {
                console.warn(`Comando no encontrado en el mapa: "${resolvedCommand}"`);
                return;
            }

            const replyMessage = await handler(client, message);
            
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