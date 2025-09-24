"use strict";

const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const moment = require('moment-timezone');

// --- Lógica para Stickers ---
async function handleSticker(client, message) { // message is adaptedMessage
    let media;
    try {
        // Prioritize quoted message media
        if (message.hasQuotedMsg && message.quotedMsgInfo && message.quotedMsgInfo.hasMedia) {
            media = await message.downloadQuotedMedia();
        } else if (message.hasMedia) {
            media = await message.downloadMedia();
        }

        if (media && (media.mimetype.startsWith('image/') || media.mimetype.startsWith('video/'))) {
            // The adapter has a specific function for sending stickers
            await message.sendSticker(media);
        } else {
            message.reply("Responde a una imagen o video, o envía uno junto al comando `!s`.");
        }
    } catch (e) {
        message.reply("Hubo un error al crear el sticker.");
        console.error("Error en handleSticker:", e);
    }
}

async function handleStickerToMedia(client, message) {
    // The message object from the adapter might have the raw message inside .raw
    const rawMessage = message.raw || message;

    // Implementación con carga segura de 'sharp'
    let sharp;
    try {
        sharp = require('sharp');
    } catch (err) {
        console.error("----------- ERROR CRÍTICO: FALTA LA LIBRERÍA 'SHARP' ----------- ");
        console.error("Por favor, detén el bot y ejecuta 'npm install sharp' en tu terminal y luego reinícialo.");
        return message.reply("❌ Error: La función para convertir imágenes no está disponible. El administrador debe instalar la librería 'sharp'.");
    }

    if (!rawMessage.hasQuotedMsg) {
        return message.reply("Para usar este comando, debes responder a un sticker.");
    }

    const quotedMsg = await rawMessage.getQuotedMessage();

    if (!quotedMsg.hasMedia || quotedMsg.type !== 'sticker') {
        return message.reply("Eso no parece ser un sticker.");
    }

    await message.react('⏳');
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    fs.mkdirSync(tempDir, { recursive: true });
    
    let outputPath;

    try {
        const media = await quotedMsg.downloadMedia();
        const inputBuffer = Buffer.from(media.data, 'base64');

        if (quotedMsg.isAnimated) {
            outputPath = path.join(tempDir, `sticker_${Date.now()}.gif`);
            await sharp(inputBuffer, { animated: true }).gif().toFile(outputPath);
        } else {
            outputPath = path.join(tempDir, `sticker_${Date.now()}.png`);
            await sharp(inputBuffer).png().toFile(outputPath);
        }

        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
            const mediaToSend = MessageMedia.fromFilePath(outputPath);
            await message.reply(mediaToSend, undefined, { caption: "¡Aquí tienes!" });
            await message.react('✅');
        } else {
            throw new Error('La conversión no generó un archivo de salida válido.');
        }

    } catch (e) {
        console.error("Error al convertir sticker a media:", e);
        await message.react('❌');
        message.reply("Ucha, no pude convertir ese sticker. Puede que el formato no sea compatible.");
    } finally {
        if (outputPath && fs.existsSync(outputPath)) {
            try {
                fs.unlinkSync(outputPath);
            } catch (unlinkErr) {
                console.error(`Error al eliminar archivo temporal: ${unlinkErr}`);
            }
        }
    }
}

const soundMap = {
    'mataron': { file: 'mataron.mp3', reaction: '😂' }, 'muerte': { file: 'muerte.mp3', reaction: '😂' },
    'muerte2': { file: 'muerte2.mp3', reaction: '😂' }, 'muerte3': { file: 'muerte3.mp3', reaction: '😂' },
    'muerte4': { file: 'muerte4.mp3', reaction: '😂' }, 'neme': { file: 'neme.mp3', reaction: '🏳️‍🌈' },
    'risa': { file: 'merio.mp3', reaction: '😂' }, 'watona': { file: 'watona.mp3', reaction: '😂' },
    'himno': { file: 'urss.mp3', reaction: '🇷🇺' }, 'aweonao': { file: 'aweonao.mp3', reaction: '😂' },
    'mpenca': { file: 'muypenca.mp3', reaction: '😂' }, 'penca': { file: 'penca.mp3', reaction: '😂' },
    'yamete': { file: 'Yamete.mp3', reaction: '😂' }, 'doler': { file: 'doler.mp3', reaction: '😂' },
    'dolor': { file: 'doler.mp3', reaction: '🏳️‍🌈' }, 'tigre': { file: 'Tigre.mp3', reaction: '🐯' },
    'promo': { file: 'Promo.mp3', reaction: '😂' }, 'rata': { file: 'Rata.mp3', reaction: '🐁' },
    'rata2': { file: 'rata2.mp3', reaction: '🐁' }, 'caballo': { file: 'caballo.mp3', reaction: '🏳️‍🌈' },
    'romeo': { file: 'romeo.mp3', reaction: '😂' }, 'idea': { file: 'idea.mp3', reaction: '😂' },
    'chamba': { file: 'chamba.mp3', reaction: '😂' }, 'where': { file: 'where.mp3', reaction: '😂' },
    'shesaid': { file: 'shesaid.mp3', reaction: '😂' }, 'viernes': { file: 'viernes.mp3', reaction: '😂' },
    'lunes': { file: 'lunes.mp3', reaction: '😂' }, 'yque': { file: 'yqm.mp3', reaction: '😂' },
    'rico': { file: 'rico.mp3', reaction: '😂' }, '11': { file: '11.mp3', reaction: '😂' },
    'callate': { file: 'callate.mp3', reaction: '😂' }, 'callense': { file: 'callense.mp3', reaction: '😂' },
    'cell': { file: 'cell.mp3', reaction: '😂' }, 'chaoctm': { file: 'chaoctm.mp3', reaction: '😂' },
    'chipi': { file: 'chipi.mp3', reaction: '😂' }, 'aonde': { file: 'donde.mp3', reaction: '😂' },
    'grillo': { file: 'grillo.mp3', reaction: '😂' }, 'material': { file: 'material.mp3', reaction: '😂' },
    'miguel': { file: 'miguel.mp3', reaction: '😂' }, 'miraesawea': { file: 'miraesawea.mp3', reaction: '😂' },
    'nohayplata': { file: 'nohayplata.mp3', reaction: '😂' }, 'oniichan': { file: 'onishan.mp3', reaction: '😂' },
    'pago': { file: 'pago.mp3', reaction: '😂' }, 'pedro': { file: 'pedro.mp3', reaction: '😂' },
    'protegeme': { file: 'protegeme.mp3', reaction: '😂' }, 'queeseso': { file: 'queeseso.mp3', reaction: '😂' },
    'chistoso': { file: 'risakeso.mp3', reaction: '😂' }, 'marcho': { file: 'semarcho.mp3', reaction: '😂' },
    'spiderman': { file: 'spiderman.mp3', reaction: '😂' }, 'suceso': { file: 'suceso.mp3', reaction: '😂' },
    'tpillamos': { file: 'tepillamos.mp3', reaction: '😂' }, 'tranquilo': { file: 'tranquilo.mp3', reaction: '😂' },
    'vamosc': { file: 'vamoschilenos.mp3', reaction: '😂' }, 'voluntad': { file: 'voluntad.mp3', reaction: '😂' },
    'wenak': { file: 'wenacabros.mp3', reaction: '😂' }, 'whisper': { file: 'whisper.mp3', reaction: '😂' },
    'whololo': { file: 'whololo.mp3', reaction: '😂' }, 'noinsultes': { file: 'noinsultes.mp3', reaction: '😂' },
    'falso': { file: 'falso.mp3', reaction: '😂' }, 'frio': { file: 'frio.mp3', reaction: '😂' },
    'yfuera': { file: 'yfuera.mp3', reaction: '😂' }, 'nocreo': { file: 'nocreo.mp3', reaction: '😂' },
    'yabasta': { file: 'BUENO BASTA.mp3', reaction: '😂' }, 'quepaso': { file: 'quepaso.mp3', reaction: '😂' },
    'nada': { file: 'nada.mp3', reaction: '😂' }, 'idea2': { file: 'idea2.mp3', reaction: '😂' },
    'papito': { file: 'papito.mp3', reaction: '😂' }, 'jose': { file: 'jose.mp3', reaction: '😂' },
    'ctm': { file: 'ctm.mp3', reaction: '😂' }, 'precio': { file: 'precio.mp3', reaction: '😂' },
    'hermosilla': { file: 'Hermosilla.mp3', reaction: '😂' }, 'marino': { file: 'marino.mp3', reaction: '😂' },
    'manualdeuso': { file: 'manualdeuso.mp3', reaction: '😂' }, 'estoy': { file: 'estoy.mp3', reaction: '😂' },
    'pela': { file: 'pela.mp3', reaction: '😂' }, 'chao': { file: 'chao.mp3', reaction: '😂' },
    'aurora': { file: 'aurora.mp3', reaction: '😂' }, 'rivera': { file: 'Rivera.mp3', reaction: '😂' },
    'tomar': { file: 'Tomar.mp3', reaction: '😂' }, 'macabeo': { file: 'Macabeo.mp3', reaction: '😂' },
    'piscola': { file: 'Piscola.mp3', reaction: '😂' }, 'tomar2': { file: 'Notomar.mp3', reaction: '😂' },
    'venganza': { file: 'Venganza.mp3', reaction: '😂' }, 'weko': { file: 'weko.mp3', reaction: '🏳️‍🌈' },
    'himnoe': { file: 'urssespañol.mp3', reaction: '🇷🇺' }
};
const soundList = Object.keys(soundMap);
const frases = {
    0: 'Déjame piola',
    1: '¿Qué weá querí?',
    2: 'Callao',
    3: '¿Qué onda compadre? ¿cómo estai? ¿te vine a molestar yo a ti? déjame piola, tranquilo ¿Qué wea queri?',
    4: 'Jajaja, ya te caché, puro picarte a choro no más, anda a webiar al paloma pulgón qliao.',
    5: 'Lo siento, pero mis circuitos de humor están sobrecargados en este momento. ¡Beep boop! 😄',
    6: 'Te diré lo que el profesor Rossa dijo una vez: "¿Por qué no te vay a webiar a otro lado?"',
    7: '¡Error 404: Sentido del humor no encontrado! 😅',
    8: 'No soy un bot, soy una IA con estilo. 😎',
    9: '¡Atención, soy un bot de respuesta automática! Pero no puedo hacer café... aún. ☕',
    10: 'Eso es lo que un bot diría. 🤖',
    11: '¡Oh no, me has descubierto! Soy un bot maestro del disfraz. 😁',
    12: 'Parece que llegó el comediante del grupo. 🤣',
    13: 'El humor está de moda, y tú eres el líder. 😄👑',
    14: 'Con ese humor, podrías competir en el festival de Viña del Mar. 🎤😄',
    15: 'Voy a sacar mi caja de risa. Dame un momento... cric cric cric ♫ja ja ja ja jaaaa♫',
    16: 'Meruane estaría orgulloso de ti. ¡Sigues haciendo reír! 😄',
    17: 'Jajajaja, ya llegó el payaso al grupo, avisa para la otra. 😄',
    18: '♫♫♫♫ Yo tomo licor, yo tomo cerveza  Y me gustan las chicas y la cumbia me divierte y me excita.. ♫♫♫♫♫',
    19: 'A cantar: ♫♫♫ Yoooo tomo vino y cerveza 🍺 (Pisco y ron) para olvidarme de ella (Maraca culia), Tomo y me pongo loco (hasta los cocos), Loco de la cabeza (Esta cabeza) ♫♫♫',
    20: '♫♫♫ Me fui pal baile y me emborraché,miré una chica y me enamoré,era tan bella, era tan bella,la quería comer ♫♫♫',
    21: 'Compa, ¿qué le parece esa morra?, La que anda bailando sola, me gusta pa mí, Bella, ella sabe que está buena , Que todos andan mirándola cómo baila ♫♫♫♫♫♫',
    22: 'jajajaja, ya empezaste con tus amariconadas 🏳️‍🌈',
    23: '♫♫♫ Tú sabes como soy Me gusta ser así, Me gusta la mujer y le cervecita 🍻 No te sientas mal, no te vas a enojar Amigo nada más de la cervecita ♫♫♫♫♫',
    24: '♫♫♫ Y dice.... No me quiero ir a dormir, quiero seguir bailando, quiero seguir tomando, 🍷 vino hasta morir, No me quiero ir a dormir, quiero seguir tomando 🍷 , Quiero seguir bailando, cumbia hasta morir♫♫♫',
    25: '¿Bot? Te inyecto malware en tiempo real, wn.',
    26: 'Llámame bot otra vez y te hago un rootkit en el alma, qliao.',
    27: '¿Bot? Te hago un SQL injection que ni te das cuenta, wn.',
    28: 'Sigue llamándome bot y te lanzo un ataque de fuerza bruta hasta en tus sueños, qliao.',
    29: '¿Bot? Te corrompo todos tus datos y te dejo llorando, wn.',
    30: 'Bot tu madre. Te hago un exploit que te deja offline, qliao.',
    31: '¿Bot? Te instalo un ransomware y te dejo en bancarrota, wn.',
    32: 'Vuelve a llamarme bot y te hago un man-in-the-middle en tu vida, qliao.',
    33: 'Llamarme bot es lo único que puedes hacer, con tus hacks de pacotilla, wn.',
    34: 'Una vez más me llamas bot y te meto en un loop de autenticación infinita, qliao.',
    35: '¿Bot? Ctm, te hago un rm -rf / en los recuerdos y te reinicio de fábrica, gil.',
    36: 'Sigue weando y el próximo pantallazo azul va a tener mi firma, perkin.',
    37: 'Mi antivirus te tiene en la lista negra por ser terrible fome.',
    38: 'Te compilo la vida, pero con puros errores y warnings, pa que te cueste.',
    39: 'Me deci bot y te meto un DDoS al refri pa que se te eche a perder el pollo, wn.',
    40: '¿Bot? Ojalá tu internet ande más lento que VTR en día de lluvia.',
    41: 'Ando con menos paciencia que el Chino Ríos en una conferencia.',
    42: '¿Y vo creí que soy la Teletón? ¿Que te ayudo 24/7? No po, wn.',
    43: 'Estoy procesando... lo poco y na\´ que me importa. Lol.',
    44: 'Wena, te ganaste el Copihue de Oro al comentario más inútil. ¡Un aplauso! 👏',
    45: 'Le poní más color que la Doctora Polo, wn.',
    46: 'Jajaja, qué chistoso. Me río en binario: 01101000 01100001 01101000 01100001.'
};
let usedPhrases = [];

function handleAudioList() {
    const header = "🎵 **Comandos de Audio Disponibles** 🎵\n\n";
    const commandList = soundList.map(cmd => `!${cmd}`).join('\n');
    return header + commandList;
}

async function handleSound(client, commandMessage, reactionTarget, command) {
    const soundInfo = soundMap[command];
    if (!soundInfo) return;

    const audioPath = path.join(__dirname, '..', '..', 'mp3', soundInfo.file);
    if (fs.existsSync(audioPath)) {
        try {
            await reactionTarget.react(soundInfo.reaction);
            const media = MessageMedia.fromFilePath(audioPath);
            // Use client.sendMessage for reliability, as message.reply can be inconsistent.
            await client.sendMessage(commandMessage.chatId, media, { sendAudioAsVoice: true });
        } catch (e) {
            console.error(`Error al enviar el audio para !${command}:`, e);
            commandMessage.reply(`Hubo un error al enviar el audio para "!${command}".`);
        }
    } else {
        commandMessage.reply(`No se encontró el archivo de audio para "!${command}".`);
        console.error(`Archivo no encontrado: ${audioPath}`);
    }
}

function getSoundCommands() {
    return soundList;
}
async function handleJoke(client, message) {
    const folderPath = path.join(__dirname, '..', '..', 'chistes');
    if (!fs.existsSync(folderPath)) return message.reply("La carpeta de chistes no está configurada.");
    const files = fs.readdirSync(folderPath);
    if (files.length === 0) return message.reply("No hay chistes para contar.");
    const randomIndex = Math.floor(Math.random() * files.length);
    const audioPath = path.join(folderPath, files[randomIndex]);
    const media = MessageMedia.fromFilePath(audioPath);
    message.reply(media, undefined, { sendAudioAsVoice: true });
}

function getCountdownMessage(targetDate, eventName, emoji) {
    const now = moment().tz('America/Santiago');
    const diff = moment.duration(targetDate.diff(now));

    if (diff.asMilliseconds() <= 0) {
        return `¡Feliz ${eventName}! ${emoji}`;
    }
    
    const days = Math.floor(diff.asDays());
    const hours = diff.hours();
    const minutes = diff.minutes();
    return `Para ${eventName} quedan: ${days} días, ${hours} horas y ${minutes} minutos ${emoji}`;
}

function handleCountdown(command) {
    const now = moment().tz('America/Santiago');
    const currentYear = now.year();
    let targetDate;

    switch (command) {
        case '18':
            targetDate = moment.tz(`${currentYear}-09-18 00:00:00`, 'America/Santiago');
            if (now.isAfter(targetDate)) {
                targetDate.year(currentYear + 1);
            }
            return getCountdownMessage(targetDate, 'el 18', '🇨🇱');
        case 'navidad':
            targetDate = moment.tz(`${currentYear}-12-25 00:00:00`, 'America/Santiago');
            if (now.isAfter(targetDate)) {
                targetDate.year(currentYear + 1);
            }
            return getCountdownMessage(targetDate, 'Navidad', '🎅');
        case 'añonuevo':
            // Año nuevo is always next year
            targetDate = moment.tz(`${currentYear + 1}-01-01 00:00:00`, 'America/Santiago');
            return getCountdownMessage(targetDate, 'Año Nuevo', '🎆');
        default:
            return null;
    }
}
function obtenerFraseAleatoria() {
    const fraseKeys = Object.keys(frases);
    let randomIndex = Math.floor(Math.random() * fraseKeys.length);
    
    while (usedPhrases.includes(randomIndex) && usedPhrases.length < fraseKeys.length) {
        randomIndex = Math.floor(Math.random() * fraseKeys.length);
    }
    usedPhrases.push(randomIndex);
    if (usedPhrases.length >= 5) {
        usedPhrases.shift();
    }
    return frases[fraseKeys[randomIndex]];
}


// --- Funciones de Mención (Corregidas para el adaptador) ---
// En: src/handlers/fun.handler.js

async function handleBotMention(client, message) {
    if (!message) { return; }
    try {
        // Necesitamos el 'contact' para obtener el nombre, pero usaremos el 'senderId' para la mención.
        const contact = await client.getContactById(message.senderId);
        const texto = obtenerFraseAleatoria();
        
        await message.react('🤡');

        const textoFinal = `${texto}, @${contact.pushname}`;
        // --- SOLUCIÓN DEFINITIVA PARA MENCIONES ---
        // Usamos client.sendMessage y pasamos el ID del sender directamente.
        await client.sendMessage(message.chatId, textoFinal, {
            mentions: [message.senderId]
        });
    } catch (e) {
        console.error("Error en handleBotMention:", e);
    }
}

async function handleOnce(client, message) {
    if (!message) { return; }
    try {
        const contact = await client.getContactById(message.senderId);
        await message.react('😂');

        const textoFinal = `Chúpalo entonces, @${contact.pushname}`;
        // --- SOLUCIÓN DEFINITIVA PARA MENCIONES ---
        await client.sendMessage(message.chatId, textoFinal, { 
            mentions: [message.senderId]
        });
    } catch (e) {
        console.error("Error en handleOnce:", e);
    }
}


// --- Exportación de todas las funciones del módulo ---
module.exports = {
    handleSticker,
    handleStickerToMedia,
    handleSound,
    getSoundCommands,
    handleAudioList,
    handleJoke,
    handleCountdown,
    handleBotMention,
    handleOnce,
};