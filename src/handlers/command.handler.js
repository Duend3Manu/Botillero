"use strict";

const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');

// --- Importaciones de Servicios (Python y otros) ---
const metroService = require('../services/metro.service');
const nationalTeamService = require('../services/nationalTeam.service');
const economyService = require('../services/economy.service');
const horoscopeService = require('../services/horoscope.service');
const externalService = require('../services/external.service');
const messagingService = require('../services/messaging.service.js');
const { getMatchDaySummary, getLeagueTable, getLeagueUpcomingMatches } = require('../services/league.service.js');
const bannerService = require('../services/banner.service.js');
const textoService = require('../services/texto.service.js');
const networkService = require('../services/network.service.js');
const utilityService = require('../services/utility.service.js');
// const rutificadorService = require('../services/rutificador.service.js'); // Eliminado

// --- Importaciones de Manejadores (Handlers) ---
const { handlePing } = require('./system.handler');
const { handleFeriados, handleFarmacias, handleClima, handleSismos, handleBus, handleSec, handleMenu } = require('./utility.handler');
const { handleSticker, handleStickerToMedia, handleSound, getSoundCommands, handleAudioList, handleJoke, handleCountdown, handleBotMention, handleOnce, handleRuleta, handlePuntos } = require('./fun.handler');
const { handleWikiSearch, handleNews, handleGoogleSearch } = require('./search.handler');
const { handleTicket, handleCaso } = require('./stateful.handler');
const { handleAiHelp } = require('./ai.handler');
const { handlePhoneSearch, handleTneSearch, handlePatenteSearch } = require('./personalsearch.handler'); // Eliminado handleRutSearch
const { handleNetworkQuery, handleNicClSearch } = require('./network.handler');

// --- Utilidades ---
const soundCommands = getSoundCommands();
const countdownCommands = ['18', 'navidad', 'añonuevo'];

// Esta función ahora es interna y se usa de forma diferente
function getArgs(body) {
    return body.trim().split(/\s+/).slice(1);
}

async function commandHandler(client, message) {
    const rawTextLower = message.body.toLowerCase();

    try {
        // --- Menciones y comandos especiales (se ejecutan primero) ---
        if (/\b(bot|boot|bott|bbot)\b/.test(rawTextLower)) {
            return handleBotMention(client, message);
        }
        if (/\b(once|onse|11)\b/.test(rawTextLower)) {
            return handleOnce(client, message);
        }

        // --- NUEVA LÓGICA DE DETECCIÓN DE COMANDOS ---
        const commandMatch = message.body.match(/(?:!|\/)(\w+)/);

        // Si no se encuentra un patrón como !comando en todo el texto, no hace nada más.
        if (!commandMatch) {
            return;
        }

        // commandMatch[0] es el comando con prefijo (ej: "!metro")
        // commandMatch[1] es solo el comando (ej: "metro")
        const command = commandMatch[1].toLowerCase();
        
        // Para que el resto de la lógica de argumentos funcione, "simulamos"
        // que el mensaje empieza con el comando encontrado.
        const commandStartIndex = message.body.indexOf(commandMatch[0]);
        const simulatedBody = message.body.substring(commandStartIndex);
        
        // Creamos un objeto de mensaje modificado para no alterar el original.
        // Los handlers que necesiten leer argumentos usarán este objeto.
        const modifiedMessage = { ...message, body: simulatedBody };

        let replyMessage;

        console.log(`(Handler) -> Comando detectado: "${command}" en el texto: "${message.body}"`);

        // --- Comandos de sonido y countdown ---
        if (soundCommands.includes(command)) {
            // NUEVA LÓGICA DE REACCIÓN CONTEXTUAL
            let reactionTarget = message; // Por defecto, reacciona al propio comando
            if (message.hasQuotedMsg) {
                // Si es una respuesta, el objetivo de la reacción es el mensaje citado
                reactionTarget = await message.getQuotedMessage();
            }
            // Se le pasa el mensaje del comando para la respuesta y el mensaje objetivo para la reacción
            return handleSound(client, message, reactionTarget, command);
        }
        if (countdownCommands.includes(command)) {
            replyMessage = handleCountdown(command);
            return message.reply(replyMessage);
        }

        // El switch ahora opera con el comando extraído
        // Y le pasamos el "modifiedMessage" a los handlers que leen argumentos
        switch (command) {
            case 'tabla':
            case 'ligatabla':
                messagingService.sendLoadingMessage(message);
                replyMessage = await getLeagueTable();
                break;
            case 'prox':
            case 'ligapartidos':
                messagingService.sendLoadingMessage(message);
                replyMessage = await getLeagueUpcomingMatches();
                break;
            case 'partidos':
                messagingService.sendLoadingMessage(message);
                replyMessage = await getMatchDaySummary();
                break;
            
            case 'metro': {
                messagingService.sendLoadingMessage(message);
                const metroResult = await metroService.getMetroStatus();
                if (metroResult.type === 'video') {
                    const media = MessageMedia.fromFilePath(metroResult.path);
                    return client.sendMessage(message.from, media, { caption: metroResult.caption });
                } else {
                    replyMessage = metroResult.content;
                }
                break;
            }

            case 'random':
                try {
                    messagingService.sendLoadingMessage(message);
                    const randomInfo = await utilityService.getRandomInfo();
                    if (typeof randomInfo === 'object' && randomInfo.type === 'image') {
                        const media = await MessageMedia.fromUrl(randomInfo.url, { unsafeMime: true });
                        await client.sendMessage(message.from, media, { caption: randomInfo.caption });
                    } else if (typeof randomInfo === 'string' && randomInfo) {
                        await client.sendMessage(message.from, randomInfo);
                    } else {
                        await message.reply("No pude obtener un dato aleatorio, intenta de nuevo.");
                    }
                } catch (error) {
                    console.error("[DEBUG command.handler] Error en !random:", error);
                    await message.reply("Ucha, algo se rompió feo con el comando !random. Revisa la consola.");
                }
                return;

            case 'tclasi': case 'selecciontabla':
                replyMessage = await nationalTeamService.getQualifiersTable();
                break;
            case 'clasi': case 'seleccionpartidos':
                replyMessage = await nationalTeamService.getQualifiersMatches();
                break;
            case 'valores':
                replyMessage = await economyService.getEconomicIndicators();
                break;
            case 'horoscopo': {
                const signo = getArgs(modifiedMessage.body)[0];
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
            }
            case 'bencina': {
                const comuna = getArgs(modifiedMessage.body)[0];
                replyMessage = await externalService.getBencinaData(comuna);
                break;
            }
            case 'trstatus':
                replyMessage = await externalService.getTraductorStatus();
                break;
            case 'bolsa':
                replyMessage = await externalService.getBolsaData();
                break;

            case 'ping': replyMessage = await handlePing(message, client); break;
            case 'feriados': replyMessage = await utilityService.getFeriados(); break;
            case 'far': replyMessage = await handleFarmacias(modifiedMessage); break;
            case 'clima': replyMessage = await handleClima(modifiedMessage); break;
            case 'sismos': replyMessage = await handleSismos(); break;
            case 'bus': return handleBus(modifiedMessage, client);
            case 'sec': case 'secrm': replyMessage = await handleSec(modifiedMessage); break;
            case 'menu': case 'comandos': replyMessage = handleMenu(); break;
            case 'wiki': replyMessage = await handleWikiSearch(modifiedMessage); break;
            case 'noticias': replyMessage = await handleNews(); break;
            case 'g': replyMessage = await handleGoogleSearch(modifiedMessage); break;
            case 'pat': case 'patente': return handlePatenteSearch(modifiedMessage);
            // case 'rut': case 'nombre': return handleRutSearch(modifiedMessage); // Eliminado
            case 's': return handleSticker(client, message);
            case 'toimg': case 'imagen': return handleStickerToMedia(client, message);
            case 'audios': case 'sonidos': replyMessage = handleAudioList(); break;
            case 'chiste': return handleJoke(client, message);
            case 'ticket': case 'ticketr': case 'tickete': replyMessage = handleTicket(modifiedMessage); break;
            case 'caso': case 'ecaso': case 'icaso': replyMessage = await handleCaso(modifiedMessage); break;
            case 'ayuda': replyMessage = await handleAiHelp(modifiedMessage); break;
            case 'num': case 'tel': return handlePhoneSearch(client, modifiedMessage);
            case 'id':
                message.reply(`ℹ️ El ID de este chat es:\n${message.from}`);
                return;
            case 'ruleta': return handleRuleta(client, message);
            case 'puntos': case 'score': return handlePuntos(client, message);

            case 'net':
            case 'whois': {
                const domainToAnalyze = getArgs(modifiedMessage.body)[0];
                if (!domainToAnalyze) {
                    return message.reply("Por favor, dame un dominio o IP para analizar. Ej: `!net google.com`");
                }
                messagingService.sendLoadingMessage(message);
                const fullResult = await networkService.analyzeDomain(domainToAnalyze);
                const [messageText, filePath] = fullResult.split('|||FILE_PATH|||');
                await client.sendMessage(message.from, messageText.trim());
                if (filePath && filePath.trim()) {
                    const cleanFilePath = filePath.trim();
                    const fileMedia = MessageMedia.fromFilePath(cleanFilePath);
                    await client.sendMessage(message.from, fileMedia);
                    setTimeout(() => {
                        try {
                            fs.unlinkSync(cleanFilePath);
                        } catch (err) {
                            console.error(`(Limpieza) -> Error al eliminar el archivo temporal: ${err.message}`);
                        }
                    }, 15000);
                }
                return;
            }

            case 'banner': {
                const args = getArgs(modifiedMessage.body);
                if (args.length < 2) {
                    return message.reply("Formato incorrecto. Usa: `!banner <estilo> <texto>`.\n\nEstilos disponibles: `vengadores`, `shrek`, `mario`, `nintendo`, `sega`, `potter`, `starwars`,`disney`, `stranger`.");
                }
                const style = args[0];
                const text = args.slice(1).join(' ');
                try {
                    message.reply(`Creando tu banner estilo *${style}*... ✨`);
                    const bannerPath = await bannerService.createBanner(style, text);
                    const bannerMedia = MessageMedia.fromFilePath(bannerPath);
                    await client.sendMessage(message.from, bannerMedia);
                    fs.unlinkSync(bannerPath);
                } catch (error) {
                    message.reply(`Hubo un error: ${error.message}`);
                }
                return;
            }

            case 'texto': {
                let imageMsg_texto = null;
                if (message.hasMedia) {
                    imageMsg_texto = message;
                } else if (message.hasQuotedMsg) {
                    const quotedMsg = await message.getQuotedMessage();
                    if (quotedMsg.hasMedia) {
                        imageMsg_texto = quotedMsg;
                    }
                }
                if (!imageMsg_texto) {
                    return message.reply("Para agregar texto, envía una imagen con el comando en el comentario, o responde a una imagen.");
                }
                const textoCompleto = getArgs(modifiedMessage.body).join(' ');
                if (!textoCompleto.includes('-')) {
                    return message.reply("Formato incorrecto. Usa: `!texto texto arriba - texto abajo`");
                }
                const [textoArriba, textoAbajo] = textoCompleto.split('-').map(t => t.trim());
                try {
                    const media = await imageMsg_texto.downloadMedia();
                    if (media) {
                        const tempImagePath = `./temp_texto_${Date.now()}.${media.mimetype.split('/')[1] || 'jpeg'}`;
                        fs.writeFileSync(tempImagePath, Buffer.from(media.data, 'base64'));
                        message.reply("Añadiendo texto a tu imagen... ✍️");
                        const finalImagePath = await textoService.addTextToImage(tempImagePath, textoArriba, textoAbajo);
                        const finalMedia = MessageMedia.fromFilePath(finalImagePath);
                        await client.sendMessage(message.from, finalMedia);
                        fs.unlinkSync(tempImagePath);
                        fs.unlinkSync(finalImagePath);
                    }
                } catch (error) {
                    console.error(error);
                    message.reply("Hubo un error al procesar la imagen. 😔");
                }
                return;
            }

            default: 
                // Si el comando extraído no está en el switch, no hacemos nada.
                // Esto evita que el bot responda a cualquier palabra que empiece con "!"
                break;
        }

        if (replyMessage) {
            client.sendMessage(message.from, replyMessage);
        }
    } catch (err) {
        console.error("[command.handler] Error inesperado:", err);
        message.reply("Ocurrió un error inesperado al procesar tu comando.");
    }
}

module.exports = commandHandler;
