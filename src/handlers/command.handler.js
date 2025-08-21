"use strict";

const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');

// --- Importaciones de Servicios (Python) ---
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

// --- Importaciones de Manejadores (Handlers) ---
const { handlePing } = require('./system.handler');
const { handleFeriados, handleFarmacias, handleClima, handleSismos, handleBus, handleSec, handleMenu } = require('./utility.handler');
const { handleSticker, handleStickerToMedia, handleSound, getSoundCommands, handleAudioList, handleJoke, handleCountdown, handleBotMention, handleOnce, handleRuleta, handlePuntos } = require('./fun.handler');
const { handleWikiSearch, handleNews, handleGoogleSearch } = require('./search.handler');
const { handleTicket, handleCaso } = require('./stateful.handler');
const { handleAiHelp } = require('./ai.handler');
const { handlePhoneSearch, handleTneSearch, handlePatenteSearch } = require('./personalsearch.handler');
const { handleNetworkQuery, handleNicClSearch } = require('./network.handler');

// --- Utilidades ---
const soundCommands = getSoundCommands();
const countdownCommands = ['18', 'navidad', 'añonuevo'];

function getArgs(message) {
    return message.body.trim().split(/\s+/).slice(1);
}

async function commandHandler(client, message) {
    const rawText = message.body.toLowerCase().trim();

    try {
        // --- Menciones y comandos especiales ---
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

        // --- Comandos de sonido y countdown ---
        if (soundCommands.includes(command)) {
            return handleSound(client, message, command);
        }
        if (countdownCommands.includes(command)) {
            replyMessage = handleCountdown(command);
            return message.reply(replyMessage);
        }

        switch (command) {
            // --- Comandos con mensaje de "cargando..." ---
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
            case 'metro':
                messagingService.sendLoadingMessage(message);
                replyMessage = await metroService.getMetroStatus();
                break;

            // --- Comando random ---
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

            // --- Otros Servicios (Python) ---
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
                const signo = getArgs(message)[0];
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
                const comuna = getArgs(message)[0];
                replyMessage = await externalService.getBencinaData(comuna);
                break;
            }
            case 'trstatus':
                replyMessage = await externalService.getTraductorStatus();
                break;
            case 'bolsa':
                replyMessage = await externalService.getBolsaData();
                break;

            // --- Handlers ---
            // --- CORRECCIÓN ---
            case 'ping': replyMessage = await handlePing(message, client); break;
            case 'feriados': replyMessage = await utilityService.getFeriados(); break;
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
            case 'id':
                message.reply(`ℹ️ El ID de este chat es:\n${message.from}`);
                return;

            case 'toimg':
            case 'imagen':
                return handleStickerToMedia(client, message);

            case 'ruleta':
                return handleRuleta(client, message);
            
            case 'puntos':
            case 'score':
                return handlePuntos(client, message);

            // --- COMANDOS DE RED ---
            case 'net':
            case 'whois': {
                const domainToAnalyze = getArgs(message)[0];
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
                            console.log(`(Limpieza) -> Archivo temporal ${cleanFilePath} eliminado.`);
                        } catch (err) {
                            console.error(`(Limpieza) -> Error al eliminar el archivo temporal: ${err.message}`);
                        }
                    }, 15000);
                }
                return;
            }

            // --- Banner ---
            case 'banner': {
                const args = getArgs(message);
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

            // --- Texto en imagen ---
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
                const textoCompleto = message.body.substring(message.body.indexOf(' ') + 1);
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

            default: break;
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