"use strict"

// Importaciones de utilidades y herramientas
const fs = require('fs');
const path = require('path');
const pathToFfmpeg = 'C:\\FFmpeg\\bin\\ffmpeg.exe';
const sanitize = require('sanitize-filename'); // Biblioteca para limpiar nombres de archivo
const streamBuffers = require('stream-buffers');
const { htmlToText } = require('html-to-text');
const puppeteer = require('puppeteer');
const { Builder, By, Key, until } = require('selenium-webdriver');
const edge = require('selenium-webdriver/edge');
const yargs = require('yargs');
const { spawn } = require('child_process');
const FormData = require('form-data');
const { exec } = require('child_process');
const { JSDOM } = require('jsdom');

// Importaciones de WhatsApp y qrcode
const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Importaciones de bibliotecas de terceros
const axios = require('axios');
const cheerio = require('cheerio');
const ffmpeg = require('fluent-ffmpeg');
const gify = require('gify');
const GoogleIt = require('google-it');
const Jimp = require('jimp');
const moment = require('moment-timezone');
const xvideos = require('@rodrigogs/xvideos');

// Importaciones de módulos personalizados
const clasi = require('./Archivos/clasi.js');
const metro = require('./Archivos/metro.js');
const proxpar = require('./Archivos/proxpar.js');
const tabla = require('./Archivos/tabla.js');
const tclasi = require('./Archivos/tclasi.js');
const valores = require('./Archivos/valores.js');

// Otras importaciones
const opts = {};

// Establecer idioma en español
moment.locale('es');

// Configuración del cliente de WhatsApp
// Configuración del cliente de WhatsApp
const webVersion = '2.3000.1016827651';
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { 
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Ruta a Chrome en Windows
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ]
  },
  webVersionCache: {
    type: 'remote',
    remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${webVersion}.html`,
  },
});
console.log("El bot se está conectando, por favor espere...");

client.setMaxListeners(Infinity);


// URL de la API de feriados
const apiUrlFeriados = 'https://apis.digital.gob.cl/fl/feriados';

// URL de la API de farmacias de turno
const apiUrlFarmacias = 'https://midas.minsal.cl/farmacia_v2/WS/getLocalesTurnos.php';

// Evento que se activa cuando se necesita escanear el código QR para iniciar sesión
client.on('qr', (qrCode) => {
  qrcode.generate(qrCode, { small: true });
});

// Evento que se activa cuando el cliente está listo para ser utilizado
client.on('ready', () => {
  console.log('BoTillero está listo');
});

// Evento que se activa cuando se recibe un mensaje
client.on('message', async (msg) => {
  console.log('Mensaje recibido:', msg.body);

  const lowerCaseBody = msg.body.toLowerCase();

  // Obtener información del remitente
  const senderInfo = await msg.getContact();

  if (lowerCaseBody === '!menu' || lowerCaseBody === '!comandos' || lowerCaseBody === '!ayuda' || lowerCaseBody === '!help') {
    sendMenu(msg.from);
} else if (lowerCaseBody === '!hola') {
    const responses = JSON.parse(fs.readFileSync('saludos.json', 'utf8'));
    const randomResponse = getRandomResponse(responses);
    client.sendMessage(msg.from, `👋🏻 ${randomResponse}`);
}
    /// Feriados//
    else if (lowerCaseBody === '!feriados') {
      try {
          const today = moment().format('YYYY-MM-DD');
          const response = await axios.get(apiUrlFeriados);
          const feriados = response.data;
  
          let replyMessage = '🥳 Próximos feriados:\n\n';
          let nextFeriados = 0;
          feriados.forEach((feriado) => {
              if (moment(feriado.fecha).isAfter(today) && nextFeriados < 6) {
                  const formattedDate = moment(feriado.fecha).format('dddd - DD/MM/YY');
                  replyMessage += `- ${formattedDate}: ${feriado.nombre}\n`;
                  nextFeriados++;
              }
          });
  
          // Si no hay más feriados en la lista, se informa al usuario.
          if (nextFeriados === 0) {
              replyMessage = 'No se encontraron próximos feriados.';
          }
  
          client.sendMessage(msg.from, replyMessage);
      } catch (error) {
          console.log('Error al obtener los feriados:', error.message);
          client.sendMessage(msg.from, 'Ocurrió un error al obtener los feriados.');
      }
      
    /// Farmacias//

  } else if (lowerCaseBody.startsWith('!far')) {
    const city = lowerCaseBody.substring(5)?.trim();
    if (city) {
      try {
        const waitMessage = 'Un momento por favor, solicitando la información ⏳';
        const waitMessageObj = await client.sendMessage(msg.from, waitMessage);
  
        const response = await axios.get(apiUrlFarmacias);
        const farmacias = response.data;
  
        // Normalizar la ciudad para buscar sin tildes y con ñ
        const normalizedCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  
        let filteredFarmacias = farmacias.filter((farmacia) =>
          farmacia.comuna_nombre.toLowerCase().includes(normalizedCity)
        );
  
        if (filteredFarmacias.length > 0) {
          let replyMessage = `🏥 Farmacias de turno en ${city}:\n\n`;
          const currentDateTime = moment();
  
          filteredFarmacias.forEach((farmacia) => {
            const {
              local_nombre,
              local_direccion,
              funcionamiento_hora_apertura,
              funcionamiento_hora_cierre,
              local_telefono,
              local_lat,
              local_lng
            } = farmacia;
  
            // Obtener la fecha y hora de apertura y cierre
            const apertura = moment(`${funcionamiento_hora_apertura} ${currentDateTime.format('YYYY-MM-DD')}`, 'HH:mm YYYY-MM-DD');
            const cierre = moment(`${funcionamiento_hora_cierre} ${currentDateTime.format('YYYY-MM-DD')}`, 'HH:mm YYYY-MM-DD');
  
            // Formatear el horario
            const horarioApertura = apertura.format('HH:mm');
            const horarioCierre = cierre.format('HH:mm');
  
            // Verificar si la farmacia está abierta en el momento actual
            const isOpen = currentDateTime.isBetween(apertura, cierre);
  
            const estado = isOpen ? 'Abierta' : 'Cerrada';
  
            const mapLink = `https://www.google.com/maps?q=${local_lat},${local_lng}`;
            replyMessage += `Farmacia: ${local_nombre}\nDirección: ${local_direccion}\nHora de apertura: ${horarioApertura}\nHora de cierre: ${horarioCierre}\nEstado: ${estado}\nTeléfono: ${local_telefono}\n${mapLink}\n\n`;
          });
  
          client.sendMessage(msg.from, replyMessage);
        } else {
          client.sendMessage(msg.from, `No se encontraron farmacias de turno en ${city}.`);
        }
      } catch (error) {
        console.log('Error al obtener las farmacias:', error.message);
        client.sendMessage(msg.from, 'Ocurrió un error al obtener las farmacias.');
      }
    } else {
      client.sendMessage(msg.from, 'aweonao Debes especificar una ciudad. Por ejemplo: `!far Santiago`');
    }
  }
  
  /// Funciones //

  else if (lowerCaseBody === '!tabla') {
    tabla.llamarTablaPy(client, msg.from);
    client.sendMessage(msg.from, '⚽ Mostrando la tabla de posiciones.');
  } else if (lowerCaseBody === '!metro') {
    metro.llamarMetroPy(client, msg.from);
    client.sendMessage(msg.from, '🚇 Mostrando información del metro.');
  } else if (lowerCaseBody === '!prox') {
    proxpar.llamarProxparPy(client, msg.from);
    client.sendMessage(msg.from, '⚽ Mostrando la fecha de partido.');
  } else if (lowerCaseBody === '!clasi') {
    clasi.llamarClasiPy(client, msg.from);
    client.sendMessage(msg.from, '⚽ Mostrando la clasificación.');
  } else if (lowerCaseBody === '!tclasi') {
    tclasi.llamarTclasiPy(client, msg.from);
    client.sendMessage(msg.from, '⚽ Mostrando la tabla de clasificación.');
  } else if (lowerCaseBody === '!valores') {
    valores.llamarValoresPy(client, msg.from);
    client.sendMessage(msg.from, '💰Mostrando los Valores.💰');
}
});

function sendMenu(chatId) {
  const menuMessage = `
📜 *Comandos disponibles* 📜

💰 **Finanzas:**
💵 !Valores 💵 
💱 !cripto 💱 - (Consulta precios de criptomonedas)

🥳 **Feriados:**
🎉 !Feriados 🎉
🎆 !18 🎆 

🏥 **Farmacias de Turno:**
🏥 !Far [ciudad] 🏥 - (Encuentra farmacias de turno)

⚽ **Fútbol Chileno:**
⚽ !Tabla ⚽ - (Tabla Torneo Nacional)
⚽ !prox ⚽ - (Próximo Partido)

🚇 **Metro de Santiago:**
🚇 !Metro 🚇 - (Consulta estado del Metro)

🚨 **Búsqueda de Videos:**
🚨 !Xv [texto] 🚨

🎰 **Juego:**
!ccp ✊🖐️✌️ - (Juega Cachipún - Advertencia +18 👀👀)

🔍 **Búsqueda:**
!G 🔎 - (Realiza una búsqueda en Google)
!Wiki 🔎 - (Realiza una búsqueda en Wikipedia)
!yt 🔎  - (Realiza una búsqueda en Youtube)

🤖 **Funciones del Bot:**
!re 🤖 - (Repite un mensaje)
!s 🤖 - (Envía un sticker)

🌤️ **Clima:**
🌤️ !clima 🌤️ - (Consulta el clima)

🌋 **Sismos:**
🌋 !sismos - (Últimos 5 sismos en Chile)

📞 **Información de teléfono:**
📞 !num o !tel - (Información de un número de teléfono)

🚌 **Información de paradero:**
🚌 !bus - (Información sobre un paradero)

📚 **Otros:**
📱 !Xiaomi 
📚 !Version
👋 **Saludos y despedidas:**
👋 !Wena 
👋 !Saluda 
👋 !Chao 

📷 **Instagram:**
👩‍💼 !Liz 
👩‍💼 !Alicia 
👩‍💼 !Vladislava 
👩‍💼 !Caro

🎵 **Comandos de Audio** 🎵

!mataron
!risa
!aweonao
!mpenca
!penca
!promo
!romeo
!idea
!cell
!chaoctm
!chipi
!aonde
!grillo
!miraesawea
!nohayplata
!pago
!pedro
!marcho
!spiderman
!suceso
!voluntad
!wenak

*¡Diviértete! 🤖🚀*
`;
  client.sendMessage(chatId, menuMessage);
}

// Función para obtener una respuesta aleatoria de un conjunto de respuestas
function getRandomResponse(responses) {
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}

// Repetir Mensaje //
client.on('message', async (msg) => {
    const command = msg.body.toLowerCase();
    try {
      if (command.startsWith('!re ')) {
        const text = msg.body.slice(4).trim();
        await msg.reply(text);
      }
    } catch (error) {
      console.error('Error al procesar el mensaje:', error);
    }
  });
  
  /// Buscador en Google ///

  client.on('message', async (message) => {
    const command = message.body.toLowerCase();
    if (command.startsWith('!g ')) {
      const searchTerm = message.body.substring(3).trim();
  
      // Realiza una búsqueda en Google
      const searchResults = await GoogleIt({ query: searchTerm });
  
      // Extrae los 5 primeros resultados de búsqueda con enlaces y descripciones
      const results = searchResults.slice(0, 5).map((result) => ({
        link: result.link,
        description: result.snippet,
      }));
  
      // Construye la respuesta del bot con los enlaces y descripciones
      let response = 'Resultados de búsqueda en Google:\n\n';
      results.forEach((result, index) => {
        response += `${index + 1}. ${result.link}\n`;
        response += `${result.description}\n\n`;
      });
  
      // Envía la respuesta al remitente del mensaje
      await client.sendMessage(message.from, response);
    }
  });
  
  /// Búsqueda en Wikipedia ///

  client.on('message', async (message) => {
    const command = message.body.toLowerCase();
    if (command.startsWith('!wiki ')) {
      const searchTerm = message.body.substring(6).trim();
  
      try {
        // Realiza una solicitud a la API de Wikipedia en español
        const searchResults = await axios.get('https://es.wikipedia.org/w/api.php', {
          params: {
            action: 'query',
            format: 'json',
            list: 'search',
            srsearch: searchTerm,
            utf8: 1,
            origin: '*',
          },
        });
  
        // Extrae los resultados de la búsqueda
        const searchItems = searchResults.data.query.search;
  
        if (searchItems.length > 0) {
          let response = 'Resultado de búsqueda en Wikipedia:\n\n';
  
          for (const result of searchItems) {
            // Elimina las etiquetas HTML del extracto
            const $ = cheerio.load(result.snippet);
            const plainTextSnippet = $.text();
  
            // Agrega detalles del artículo a la respuesta
            response += `Título: ${result.title}\n`;
            response += `Extracto: ${plainTextSnippet}\n`;
            response += `Enlace: https://es.wikipedia.org/wiki/${encodeURIComponent(result.title)}\n\n`;
          }
  
          // Envía la respuesta al remitente del mensaje
          await client.sendMessage(message.from, response);
        } else {
          // Envía un mensaje si no se encontraron resultados
          await client.sendMessage(message.from, 'No se encontraron resultados en Wikipedia.');
        }
      } catch (error) {
        console.log('Error en la búsqueda:', error);
      }
    }
  });
  
/// Sub menu ///
client.on('message', (message) => {
    const content = message.body.toLowerCase();
  
    switch (content) {
      case '!wena':
        message.reply('¡Wena ctm! 😎');
        break;
  
      case '!huaso':
        message.reply('Huaso qliao weno pal mio 🤠');
        break;
  
      case '!andy':
        message.reply('Andy Wave weno pal pico 🍄');
        break;
  
      case '!xiaomi':
        message.reply('Únete al grupo Xiaomi: https://chat.whatsapp.com/E8dtk6zzv9DHDImAEk8q9f');
        break;
  
      case '!bastian':
        message.reply('El máximo Chanero de Chile y del mundo mundial 🌎');
        break;
  
      case '!jose':
        message.reply('El máximo weko del grupo 😎');
        break;
  
      case '!pdf':
        message.reply('Puedes utilizar cualquiera de estos sitios para trabajar con PDFs:\n\n- https://www.ilovepdf.com/es\n- https://www.sejda.com/es/');
        break;
  
      case '!liz':
        message.reply('Sigue a Liz en Instagram: https://instagram.com/liz4rd_girl');
        break;
  
      case '!alicia':
        message.reply('Sigue a Alicia en Instagram: https://instagram.com/alice.dacat');
        break;
  
      case '!vladislava':
        message.reply('Sigue a Vladislava en Instagram: https://instagram.com/vladislava_661');
        break;
  
      case '!caro':
        message.reply('Sigue a Caro en Instagram: https://www.instagram.com/carolinafernanda.aa TikTok: https://www.tiktok.com/@carolinafernanda.aa');
        break;
  
      case '!saluda':
        message.reply('¡Wena giles qliaos! ¿Cómo están los pajeros? 😂');
        break;
  
      case '!chao':
        message.reply('Chao giles qliaos, después vuelvo a webiarlos 👋');
        break;
  
      case '!version':
        message.reply('Versión 6.9 🤖');
        break;
  
      case '!lenguaje':
        message.reply('Estoy programado 80% Javascript y 20% Python 🚀');
        break;
  
      default:
        // Si el mensaje no coincide con ningún comando conocido, no se envía ninguna respuesta.
        break;
    }
  });
  
// Juego de Cachipún //
client.on('message', (msg) => {
    const command = msg.body.toLowerCase();
    if (command.startsWith('!ccp')) {
      const jugador = msg.body.split(' ')[1].toLowerCase();
      if (['piedra', 'papel', 'tijera'].includes(jugador)) {
        const computadora = obtenerJugadaComputadora();
        const resultado = determinarGanador(jugador, computadora);
        const jugadorEmoji = obtenerEmoji(jugador);
        const computadoraEmoji = obtenerEmoji(computadora);
        let response = `Tu jugada: ${jugadorEmoji}\nJugada de la computadora: ${computadoraEmoji}\n${resultado}`;
  
        if (resultado === 'Ganaste') {
          const premio = obtenerPremio();
          response += `\n¡Tu premio: ${premio}!`;
        }
  
        msg.reply(response);
      } else {
        msg.reply('Opción inválida. Por favor, elige piedra, papel o tijera.');
      }
    }
  });
  
  // Función para generar la jugada aleatoria de la computadora
  function obtenerJugadaComputadora() {
    const jugadas = ['piedra', 'papel', 'tijera'];
    const indice = Math.floor(Math.random() * 3);
    return jugadas[indice];
  }
  
  // Función para determinar el resultado del juego
  function determinarGanador(jugador, computadora) {
    if (jugador === computadora) {
      return 'Empate';
    } else if (
      (jugador === 'piedra' && computadora === 'tijera') ||
      (jugador === 'papel' && computadora === 'piedra') ||
      (jugador === 'tijera' && computadora === 'papel')
    ) {
      return 'Ganaste';
    } else {
      return 'Perdiste. Inténtalo de nuevo.';
    }
  }
  
  // Función para obtener el emoticón correspondiente a la jugada
  function obtenerEmoji(jugada) {
    switch (jugada) {
      case 'piedra':
        return '✊';
      case 'papel':
        return '🖐️';
      case 'tijera':
        return '✌️';
      default:
        return '';
    }
  }
  
  // Función para obtener un premio aleatorio del archivo premios.json
  function obtenerPremio() {
    const premiosJSON = fs.readFileSync('premios.json');
    const premios = JSON.parse(premiosJSON).premios;
    const indice = Math.floor(Math.random() * premios.length);
    return premios[indice];
  }
  
  // Mencionar contacto //
  const usedPhrases = []; // Arreglo para almacenar las frases utilizadas
  
  client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const contact = await msg.getContact();
    const command = msg.body.toLowerCase();
    let texto = '';
  
    // Verifica si el mensaje contiene alguna variante de "bot"
    if (/\b(bot|boot|bott|bbot|bboot|bboott|b0t|B0t)\b/.test(command)) {
      await msg.react('🤡');
  
      // Elige una frase aleatoria que no haya sido utilizada antes
      let randomText = Math.floor(Math.random() * 7);
      while (usedPhrases.includes(randomText)) {
        randomText = Math.floor(Math.random() * 7);
      }
  
      // Almacena la frase utilizada en el arreglo
      usedPhrases.push(randomText);
  
      // Si todas las frases han sido utilizadas, reinicia el arreglo
      if (usedPhrases.length === 7) {
        usedPhrases.length = 0;
      }
  
      // Asigna texto según la frase aleatoria seleccionada
      switch (randomText) {
        case 0:
          texto = 'Dejame piola pajaron qliao';
          break;
        case 1:
          texto = '¿Qué weá querí?';
          break;
        case 2:
          texto = 'Callao';
          break;
        case 3:
          texto = 'Déjate de webiar, ¿creís que uno es Fabián?';
          break;
        case 4:
          texto = 'Chupame la corneta 🍄';
          break;
        case 5:
          texto = '¿Que onda compadre? ¿como estai? ¿te vine a molestar yo a ti? dejame piola, tranquilo ¿Que wea queri? ';
          break;   
        case 6:
          texto = 'Jajaja, ya te cache, puro picarte a choro no mas, anda a webiar al paloma pulgón qliao ';
          break; 
      }
  
      // Envia el mensaje mencionando al contacto
      await chat.sendMessage(`${texto} @${contact.id.user}`, {
        mentions: [contact]
      });
    }
  });
  

// palabras que responde 

const phoneNumbers = ['+56949115238']; // Reemplaza con los números reales.

client.on('message', async (msg) => {
  const chat = await msg.getChat();
  const contact = await msg.getContact();
  const command = msg.body.toLowerCase();

  if (command.includes('huaso')) {
    await msg.react('😅');
    await chat.sendMessage('De seguro estamos hablando del huaso Fabián.');
  } else if (command.includes('borracho') || command.includes('watusi') || command.includes('watusy')) {
    await msg.react('😅');
    await chat.sendMessage('😂😂😂😂😂😂😂 ahí te hablan Diego Garrido.');
  } else if (command.includes('boliviano') || command.includes('bolivia')) {
    await msg.react('😅');
    await chat.sendMessage('😂😂😂😂😂😂😂 ahí te hablan Jesus.');
  } else if (command.includes('chanero') || command.includes('chaneros')) {
    await msg.react('😅');
    await chat.sendMessage('😂😂😂😂😂😂😂 ahí te hablan Bastian.');
  } else if (command.includes('macabeo') || command.includes('casorio')) {
    await msg.react('😅');
    await chat.sendMessage('😂😂😂😂😂😂😂 ahí te hablan Luis.');
  } else if (command.includes('nuco')) {
    await msg.react('🤡');
    await chat.sendMessage('Tu hermana se lo come sin truco');
  }
});

/// sticker ///

client.on('message', async (message) => {
  const isStickerCommand = message.body.toLowerCase() === '!s';

  if (isStickerCommand) {
    // Si el mensaje es un comando !s
    if (message.hasMedia && (message.type === 'video' || message.type === 'gif' || message.type === 'image')) {
      // Si el mensaje tiene un medio adjunto (video, gif o imagen)
      const media = await message.downloadMedia();
      const stickerName = 'Airfryers Bot'; // Nombre del sticker
      const packName = 'Airfryers Bot'; // Nombre del pack

      const metadata = {
        sendMediaAsSticker: true,
        stickerMetadata: {
          author: 'Airfryers Bot',
          pack: packName,
          type: message.type === 'image' ? message.mimetype : 'image/gif',
          width: message.type === 'video' ? message.videoResolution?.width : message.mediaData?.width,
          height: message.type === 'video' ? message.videoResolution?.height : message.mediaData?.height,
          name: stickerName,
        },
      };

      await message.reply(media, undefined, metadata);
    } else {
      // Si el mensaje no tiene un medio adjunto, busca el último mensaje con un medio adjunto
      const chat = await message.getChat();
      const messages = await chat.fetchMessages({ limit: 10 });
      const lastMediaMessage = messages.reverse().find(msg => msg.hasMedia && (msg.type === 'video' || msg.type === 'gif' || msg.type === 'image'));

      if (lastMediaMessage) {
        const media = await lastMediaMessage.downloadMedia();
        const stickerName = 'Airfryers Bot'; // Nombre del sticker
        const packName = 'Airfryers Bot'; // Nombre del pack

        const metadata = {
          sendMediaAsSticker: true,
          stickerMetadata: {
            author: 'Airfryers Bot',
            pack: packName,
            type: lastMediaMessage.type === 'image' ? lastMediaMessage.mimetype : 'image/gif',
            width: lastMediaMessage.type === 'video' ? lastMediaMessage.videoResolution?.width : lastMediaMessage.mediaData?.width,
            height: lastMediaMessage.type === 'video' ? lastMediaMessage.videoResolution?.height : lastMediaMessage.mediaData?.height,
            name: stickerName,
          },
        };

        await message.reply(media, undefined, metadata);
      } else {
        await message.reply('Por favor, envíe un video, gif o imagen con el comando !s, o responda a uno ya enviado.');
      }
    }
  }
});

 /// Comando par llamar a todos ///

  client.on('message', async (msg) => {
    const commandPrefix = '!mnj';
  
    if (msg.body.toLowerCase().startsWith(commandPrefix)) {
      const chat = await msg.getChat();
      const commandArgs = msg.body.slice(commandPrefix.length).trim();
  
      let text = "";
  
      if (commandArgs.length > 0) {
        text = `${commandArgs}\n\n`;
      }
  
      let mentions = [];
  
      for (let participant of chat.participants) {
        mentions.push(`${participant.id.user}@c.us`);
        text += `@${participant.id.user} `;
      }
  
      await chat.sendMessage(text, { mentions });
    }
  });

/// Fiestas //

client.on('message', async (msg) => {
  const chat = await msg.getChat();
  const lowerCaseBody = msg.body.toLowerCase();

  if (lowerCaseBody === '!navidad') {
    const remainingTimeNavidad = countdownNavidad();
    await chat.sendMessage(remainingTimeNavidad);
  } else if (lowerCaseBody === '!18') {
    const remainingTime18 = countdown18();
    await chat.sendMessage(remainingTime18);
  } else if (lowerCaseBody === '!añonuevo') {
    const remainingTimeAnoNuevo = countdownAnoNuevo();
    await chat.sendMessage(remainingTimeAnoNuevo);
  }
});

function countdownNavidad() {
  const targetDate = moment.tz('2025-12-25T00:00:00', 'America/Santiago');
  return getCountdownMessage(targetDate, '🎅🎄🦌🎁✨');
}

function countdown18() {
  const targetDate = moment.tz('2025-09-18T00:00:00', 'America/Santiago');
  return getCountdownMessage(targetDate, '🍻🍺');
}

function countdownAnoNuevo() {
  const targetDate = moment.tz('2025-01-01T00:00:00', 'America/Santiago');
  return getCountdownMessage(targetDate, '🎉🥳🎆');
}

function getCountdownMessage(targetDate, emoticons) {
  const currentDate = moment().tz('America/Santiago');

  const remainingTime = targetDate.diff(currentDate);
  const duration = moment.duration(remainingTime);

  const days = Math.floor(duration.asDays()); // Use Math.floor instead of Math.ceil
  const hours = duration.hours();
  const minutes = duration.minutes();

  const countdownStr = `Quedan ${days} días, ${hours} horas y ${minutes} minutos ${emoticons}`;

  return countdownStr;
}


/// Videos +18 ///

client.on('message', async (msg) => {
  const lowerCaseBody = msg.body.toLowerCase();

  if (lowerCaseBody.startsWith('!xv')) {
    const keyword = lowerCaseBody.substring(4).trim();
    try {
      const searchUrl = `https://www.xvideos.com/?k=${encodeURIComponent(keyword)}`;
      const response = await axios.get(searchUrl);

      const $ = cheerio.load(response.data);
      const videos = [];

      // Extraer los elementos de video y obtener los detalles relevantes
      $('.mozaique .thumb-block').each((index, element) => {
        const title = $(element).find('.thumb-under .title').text().trim();
        const duration = $(element).find('.thumb-under .duration').text().trim();
        const views = parseInt($(element).find('.thumb-under .views').text().trim().replace(',', ''));
        const url = $(element).find('.thumb a').attr('href');

        videos.push({ title, duration, views, url });
      });

      // Ordenar los videos por vistas de forma descendente y duración de forma ascendente
      videos.sort((a, b) => {
        if (a.views !== b.views) {
          return b.views - a.views; // Ordenar por vistas de forma descendente
        }
        const durationA = getDurationInSeconds(a.duration);
        const durationB = getDurationInSeconds(b.duration);
        return durationB - durationA; // Ordenar por duración de forma ascendente
      });

      let replyMessage = `Resultados de búsqueda en Xvideos para "${keyword}":\n\n`;

      videos.slice(0, 12).forEach((video) => {
        replyMessage += `${video.title}\n`;
        replyMessage += `Duración: ${video.duration}\n`;
        replyMessage += `URL: https://www.xvideos.com${video.url}\n\n`;
      });

      await client.sendMessage(msg.from, replyMessage);
    } catch (error) {
      console.error('Error al buscar en Xvideos:', error.message);
      await client.sendMessage(msg.from, 'Ocurrió un error al buscar en Xvideos.');
    }
  }
});

function getDurationInSeconds(duration) {
  const parts = duration.split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseInt(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseInt(parts[0]);
    const seconds = parseInt(parts[1]);
    return minutes * 60 + seconds;
  } else if (parts.length === 1) {
    const seconds = parseInt(parts[0]);
    return seconds;
  }
  return 0;
}

/// celulizador ///

client.on('message', async message => {
  let phoneNumber = '';
  if (message.body.startsWith('!tel') || message.body.startsWith('!num')) {
      // Limpiar la variable phoneNumber de caracteres no deseados y extraer el número
      phoneNumber = message.body.replace(/^!tel|^!num/g, '').replace(/[^\x20-\x7E]/g, '').trim();

      if (phoneNumber) {
          try {
              // Agregar reacción de reloj de arena al mensaje original del usuario
              await message.react('⏳');

              let data = new FormData();
              data.append('tlfWA', phoneNumber);

              let config = {
                  method: 'post',
                  maxBodyLength: Infinity,
                  url: 'https://celuzador.porsilapongo.cl/celuzadorApi.php',
                  headers: { 
                      'User-Agent': 'CeludeitorAPI-TuCulitoSacaLlamaAUFAUF', 
                      ...data.getHeaders()
                  },
                  data: data
              };

              const response = await axios.request(config);

              if (response.data.estado === 'correcto') {
                  let regex = /\*Link Foto\* : (https?:\/\/[^\s]+)(?=\n\*Estado)/;
                  let url = response.data.data.match(regex);

                  if (url && url[1]) {
                      console.log("URL encontrada:", url[1]);
                      const media = await MessageMedia.fromUrl(url[1]);
                      // Etiquetar al usuario en el mensaje
                      await client.sendMessage(message.from, media, { caption: `ℹ️ Información del número ℹ️\n@${message.sender ? message.sender.id : ''} ${response.data.data}` });
                  } else {
                      console.log("URL no encontrada");
                      // Etiquetar al usuario en el mensaje
                      await client.sendMessage(message.from, `ℹ️ Información del número ℹ️\n@${message.sender ? message.sender.id : ''} ${response.data.data}`);
                  }

                  // Agregar reacción de check al mensaje original del usuario
                  await message.react('☑️');
              } else {
                  // Etiquetar al usuario en el mensaje
                  await message.reply(`@${message.sender ? message.sender.id : ''} ${response.data.data}`);
                  // Agregar reacción de ❌ al mensaje original del usuario en caso de error
                  await message.react('❌');
              }
          } catch (error) {
              console.error("Error al enviar el mensaje:", error);
              // Etiquetar al usuario en el mensaje
              await message.reply(`@${message.sender ? message.sender.id : ''} ⚠️ Hubo un error al enviar el mensaje. Por favor, intenta nuevamente más tarde.`);
              // Agregar reacción de ❌ al mensaje original del usuario en caso de error
              await message.react('❌');
          }
      } else {
          // Etiquetar al usuario en el mensaje
          await message.reply(`@${message.sender ? message.sender.id : ''} ⚠️ Por favor, ingresa un número de teléfono después del comando.`);
          // Agregar reacción de ❌ al mensaje original del usuario en caso de error
          await message.react('❌');
      }
  }
});

///fapello//

client.on('message', async (message) => {
  if (message.body.startsWith('!fap')) {
    const searchTerm = message.body.slice(5).trim();
    if (!searchTerm) {
      // Si no hay texto después del comando, enviar un mensaje indicando que se necesitan parámetros
      client.sendMessage(message.from, 'Por favor ingresa un término de búsqueda después de !fap');
      return;
    }

    try {
      const response = await axios.post(
        'https://celuzador.porsilapongo.cl/fappello.php',
        new URLSearchParams({
          'term': searchTerm
        }),
        {
          headers: {
            'User-Agent': 'CeludeitorAPI-TuCulitoSacaLlamaAUFAUF'
          }
        }
      );
      
      const resultados = response.data;
      
      if (resultados && resultados.length > 0) {
        let mensajeRespuesta = `Resultado de la búsqueda para "${searchTerm}":\n`;
        
        resultados.forEach((resultado, index) => {
          mensajeRespuesta += `${index + 1}. ${resultado.name} - ${resultado.profile_url}\n`;
        });
        
        // Enviar el resultado formateado al usuario
        client.sendMessage(message.from, mensajeRespuesta);
      } else {
        client.sendMessage(message.from, 'Lo siento, no se encontraron resultados para tu búsqueda.');
      }
      
    } catch (error) {
      console.error('Error al realizar la búsqueda:', error);
      // Manejo de errores
      client.sendMessage(message.from, 'Lo siento, ha ocurrido un error al realizar la búsqueda.');
    }
  } else if (message.body === '!media') {
    try {
      const media = await MessageMedia.fromUrl('https://via.placeholder.com/350x150.png');
      await client.sendMessage(message.from, media); 
    } catch (error) {
      console.error('Error al enviar media:', error);
      client.sendMessage(message.from, 'Lo siento, ha ocurrido un error al enviar la media.');
    }
  }
});



//Clima

async function obtenerClima(ciudad) {
  try {
    const response = await axios.get(`https://wttr.in/${ciudad}?format=%t+%C+%h+%w+%P`);
    return response.data.trim();
  } catch (error) {
    console.error('Error al obtener el clima:', error);
    throw error;
  }
}

// Manejar los mensajes entrantes
client.on('message', async (message) => {
  const commandRegex = /^!clima (.+)/;
  const match = message.body.match(commandRegex);

  if (match) {
    const ciudad = match[1];

    try {
      const clima = await obtenerClima(ciudad);
      const respuesta = `El clima en ${ciudad.charAt(0).toUpperCase() + ciudad.slice(1)} es: ${clima}`;
      await message.reply(respuesta);
    } catch (error) {
      console.error('Error al procesar el comando !clima:', error);
    }
  }
});

/// Sismos ///

client.on('message', async message => {
  if (message.body === '!sismos') {
      try {
          const response = await axios.get('https://api.gael.cloud/general/public/sismos');
          const sismos = response.data.slice(0, 5); // Obtiene los últimos 5 sismos
          let responseMessage = '🌍 Últimos 5 sismos:\n\n';
          sismos.forEach(sismo => {
              const { fechaHora, fechaSeparada } = formatFecha(sismo.Fecha);
              responseMessage += `📅 Hora y Fecha: ${fechaHora}\n`;
              responseMessage += `🕳 Profundidad: ${sismo.Profundidad} km\n`;
              responseMessage += `💥 Magnitud: ${sismo.Magnitud}\n`;
              responseMessage += `📍 Referencia Geográfica: ${sismo.RefGeografica}\n`;
              responseMessage += `🔗 Ver en Google Maps: https://www.google.com/maps/search/?api=1&query=${encodeURI(sismo.RefGeografica)}\n`;
              responseMessage += `🕒 Fecha de Actualización: ${formatFecha(sismo.FechaUpdate).fechaHora}\n\n`;
          });
          message.reply(responseMessage);
      } catch (error) {
          console.error('Error al obtener los sismos:', error);
          message.reply('⚠️ Hubo un error al obtener los sismos. Por favor, intenta nuevamente más tarde.');
      }
  }
});

function formatFecha(fecha) {
  if (!fecha) {
      return { fechaHora: '', fechaSeparada: '' };
  }

  const [date, time] = fecha.split('T');
  const [year, month, day] = date.split('-');

  let hour = '';
  let minute = '';
  let second = '';

  if (time) {
      const timePart = time.substring(0, 8);
      if (timePart) {
          [hour, minute, second] = timePart.split(':');
      }
  }

  const fechaHora = `${day} ${hour !== '00' ? hour : ''}:${minute !== '00' ? minute : ''}:${second !== '00' ? second : ''}`;
  const fechaSeparada = `${day}/${month}/${year}`;

  return { fechaHora, fechaSeparada };
}

//Paradero//

client.on('message', async message => {
  if (message.body.startsWith('!bus')) {
      const args = message.body.slice(4).trim().split(/ +/); // Corregido para que incluya el código de paradero correctamente
      const codigo_paradero = args[0];

      try {
          const browser = await puppeteer.launch();
          const page = await browser.newPage();

          // Envía un mensaje al usuario indicando que se está obteniendo la información
          const sentMessage = await message.reply('Espere un momento por favor mientras obtengo la información.');

          // Añadir reacción de "reloj de arena" al mensaje del usuario
          await sentMessage.react('⏳');

          const base_url = "https://www.red.cl/planifica-tu-viaje/cuando-llega/?codsimt=";
          const url = base_url + codigo_paradero;

          await page.goto(url);

          // Espera a que el paradero esté disponible
          await page.waitForSelector('.nombre-parada', { timeout: 30000 }); // Aumentar el tiempo de espera a 20 segundos

          const nombre_paradero = await page.$eval('.nombre-parada', element => element.textContent.trim());

          let response = `📍 Nombre del paradero: ${nombre_paradero}\n🚏 Código del paradero: ${codigo_paradero}\n\n`;

          const tabla_recorridos = await page.$('#nav-00');
          const filas = await tabla_recorridos.$$('tr');

          for (let i = 1; i < filas.length; i++) {
              const numero_bus = await filas[i].$eval('.bus', element => element.textContent.trim());
              const destino = await filas[i].$$eval('.td-dividido', elements => elements[1].textContent.trim());
              const tiempo_llegada = await filas[i].$eval('.td-right', element => element.textContent.trim());

              // Asignar emojis según el número del bus
              let emoji = '';
              switch (numero_bus) {
                  case '348':
                  case 'I07':
                  case '109N':
                  case '432N':
                      emoji = '🚌';
                      break;
                  // Agregar más casos según sea necesario
                  default:
                      emoji = '🚌'; // Emoticono predeterminado
              }

              response += `${emoji} Recorrido: Bus ${numero_bus}\n🗺️ Dirección: ${destino}\n⏰ Tiempo de llegada: ${tiempo_llegada}\n\n`;
          }

          await browser.close();

          // Envía el mensaje con la respuesta al mensaje del usuario correcto
          await message.reply(response);

          // Añadir reacción de "dedo arriba" al mensaje del usuario
          await message.react('👍');
      } catch (error) {
          // Si hay un error al obtener la información, envía un mensaje de error al usuario
          console.error('Error:', error.message);
          await message.reply('Pajaron qliao no se pudo obtener la información del paradero');

          // Añadir reacción de "X" al mensaje del usuario
          await message.react('❌');
      }
  }
});


/// Bencineras ///

client.on('message', async msg => {
  if (msg.body.startsWith('!bencina') || msg.body.startsWith('!Bencina')) {
      const comuna = msg.body.substring(msg.body.indexOf(' ') + 1).trim(); // Obtener la comuna después del primer espacio
      const python = spawn('python', [path.join(__dirname, 'bencina.py'), comuna]);
      
      msg.reply('Espere un momento... ⏳').then(() => {
          msg.react('⌛');
      });

      python.on('error', (err) => {
          console.error('Error al ejecutar el script de Python:', err);
          msg.reply('Ocurrió un error al obtener los datos de bencina.');
      });

      python.on('close', (code) => {
          console.log(`child process exited with code ${code}`);
          if (code !== 0) {
              msg.reply('Error al obtener los datos de bencina.');
              msg.react('❌');
              return;
          }

          const outputFile = path.join(__dirname, 'output.txt');
          fs.readFile(outputFile, 'utf8', (err, data) => {
              if (err) {
                  console.error('Error al leer el archivo de salida:', err);
                  msg.reply('Ocurrió un error al leer los datos de bencina.');
                  msg.react('❌');
                  return;
              }

              if (data.trim() === '') {
                  msg.reply('No se encontraron datos para esa comuna, aweonao.');
                  msg.react('❌');
                  return;
              }

              msg.reply(data);
              msg.react('✅');
          });
      });
  }
});

/// Audios ///

client.on('message', async (msg) => {
  const command = msg.body.toLowerCase();

  if (command === '!mataron') {
    await sendAudio('mataron.mp3', msg);
    await msg.react('😂'); // Reacción con emoji de risa.
  } else if (command === '!neme') {
    await sendAudio('neme.mp3', msg);
    await msg.react('🏳️‍🌈'); // Reacción con la bandera LGBT.
  } else if (command === '!risa') {
    await sendAudio('merio.mp3', msg);
    await msg.react('😂'); // Reacción con emoji de risa.
  } else if (command === '!aweonao') {
    await sendAudio('aweonao.mp3', msg);
    await msg.react('😂'); // Reacción con emoji de risa.
  } else if (command === '!mpenca') {
    await sendAudio('muypenca.mp3', msg);
    await msg.react('😂'); // Reacción con emoji de risa.
  } else if (command === '!penca') {
    await sendAudio('penca.mp3', msg);
    await msg.react('😂'); // Reacción con emoji de risa..
  } else if (command === '!promo') {
    await sendAudio('Promo.mp3', msg);
    await msg.react('😂'); // Reacción con emoji de risa.
  } else if (command === '!romeo') {
    await sendAudio('romeo.mp3', msg);
    await msg.react('😂');  
  } else if (command === '!idea') {
    await sendAudio('idea.mp3', msg);
    await msg.react('😂');
  } else if (command === '!yque') {
    await sendAudio('yqm.mp3', msg);
    await msg.react('😂');
  } else if (command === '!callate') {
      await sendAudio('callate.mp3', msg);
      await msg.react('😂');
  } else if (command === '!callense') {
      await sendAudio('callense.mp3', msg);
      await msg.react('😂');
  } else if (command === '!cell') {
      await sendAudio('cell.mp3', msg);
      await msg.react('😂');
  } else if (command === '!chaoctm') {
      await sendAudio('chaoctm.mp3', msg);
      await msg.react('😂');
  } else if (command === '!chipi') {
      await sendAudio('chipi.mp3', msg);
      await msg.react('😂');
  } else if (command === '!aonde') {
      await sendAudio('donde.mp3', msg);
      await msg.react('😂');
  } else if (command === '!grillo') {
      await sendAudio('grillo.mp3', msg);
      await msg.react('😂');
  } else if (command === '!material') {
      await sendAudio('material.mp3', msg);
      await msg.react('😂');
  } else if (command === '!miguel') {
      await sendAudio('miguel.mp3', msg);
      await msg.react('😂');
  } else if (command === '!miraesawea') {
      await sendAudio('miraesawea.mp3', msg);
      await msg.react('😂');
  } else if (command === '!nohayplata') {
      await sendAudio('nohayplata.mp3', msg);
      await msg.react('😂');
  } else if (command === '!pago') {
      await sendAudio('pago.mp3', msg);
      await msg.react('😂');
  } else if (command === '!pedro') {
      await sendAudio('pedro.mp3', msg);
      await msg.react('😂');
  } else if (command === '!protegeme') {
      await sendAudio('protegeme.mp3', msg);
      await msg.react('😂');
  } else if (command === '!queeseso') {
      await sendAudio('queeseso.mp3', msg);
      await msg.react('😂');
  } else if (command === '!chistoso') {
      await sendAudio('risakeso.mp3', msg);
      await msg.react('😂');
  } else if (command === '!risa') {
      await sendAudio('risakiko.mp3', msg);
      await msg.react('😂');
  } else if (command === '!marcho') {
      await sendAudio('semarcho.mp3', msg);
      await msg.react('😂');
  } else if (command === '!spiderman') {
      await sendAudio('spiderman.mp3', msg);
      await msg.react('😂');
  } else if (command === '!suceso') {
      await sendAudio('suceso.mp3', msg);
      await msg.react('😂');
  } else if (command === '!tpillamos') {
      await sendAudio('tepillamos.mp3', msg);
      await msg.react('😂');
  } else if (command === '!tranquilo') {
      await sendAudio('tranquilo.mp3', msg);
      await msg.react('😂');
  } else if (command === '!vamosc') {
      await sendAudio('vamoschilenos.mp3', msg);
      await msg.react('😂');
  } else if (command === '!voluntad') {
      await sendAudio('voluntad.mp3', msg);
      await msg.react('😂');
  } else if (command === '!wenak') {
      await sendAudio('wenacabros.mp3', msg);
      await msg.react('😂');
  } else if (command === '!whisper') {
      await sendAudio('whisper.mp3', msg);
      await msg.react('😂');
  } else if (command === '!whololo') {
      await sendAudio('whololo.mp3', msg);
      await msg.react('😂');
  } else if (command === '!noinsultes') {
      await sendAudio('noinsultes.mp3', msg);
      await msg.react('😂');
  } else if (command === '!falso') {
      await sendAudio('falso.mp3', msg);
      await msg.react('😂');    
  } else if (command === '!yfuera') {
      await sendAudio('yfuera.mp3', msg);
      await msg.react('😂');
  }
});

  async function sendAudio(audioFileName, msg) {
  const audioPath = path.join('C:', 'bots', 'AirFryers-bot', 'mp3', audioFileName);

  // Verificar si el archivo de audio existe
  if (fs.existsSync(audioPath)) {
    await msg.react('😂'); // Cambiamos la reacción al emoji de risa.
    
    const media = MessageMedia.fromFilePath(audioPath);
    await msg.reply(media, undefined, { sendMediaAsDocument: false }); // Enviamos el audio sin convertirlo en un documento.
  } else {
    await msg.reply(`No se encontró el archivo de audio "${audioFileName}" solicitado.`);
  }
}

/// Gif con audios ///

client.on('message', async (msg) => {
  if (msg.body.startsWith('!pedro')) {
      const file = 'C:\\bots\\AirFryers-bot\\mp3\\gif\\pedro.webp'; // Ruta del sticker
      const chat = await msg.getChat();

      try {
          if (fs.existsSync(file)) {
              const sticker = MessageMedia.fromFilePath(file);
              chat.sendMessage(sticker, { sendMediaAsSticker: true });
          } else {
              console.log('El archivo no existe.');
          }
      } catch (err) {
          console.log('Error al enviar el archivo:', err);
      }
  }
});


/// Patente ///

client.on('message', message => {
  console.log('Mensaje recibido:', message.body);
  if (message.body.startsWith('!patente ')) {
      const patente = message.body.split(' ')[1];
      const scriptPath = path.join(__dirname, 'patente.py');
      console.log(`Ejecutando script: python ${scriptPath} ${patente}`);

      exec(`python ${scriptPath} ${patente}`, (error, stdout, stderr) => {
          if (error) {
              console.error(`Error ejecutando el script: ${error.message}`);
              message.reply('Hubo un error al procesar tu solicitud.');
              return;
          }
          if (stderr) {
              console.error(`stderr: ${stderr}`);
              message.reply('Hubo un error al procesar tu solicitud.');
              return;
          }
          console.log(`stdout: ${stdout}`);
          message.reply(stdout || 'No se obtuvo información.');
      });
  }
});


/// Luz ///

client.on('message', async msg => {
  if (msg.body.startsWith('!sec')) {
      let region = null;
      if (msg.body === '!secrm') {
          region = 'Metropolitana';
      } else if (msg.body.startsWith('!sec ')) {
          region = msg.body.split(' ')[1];
      }

      try {
          const message = await generateWhatsAppMessage(region);
          msg.reply(message);
      } catch (error) {
          console.error('Error generating WhatsApp message:', error);
          msg.reply('Hubo un error al obtener los datos.');
      }
  }
});


/// IA ///

client.on('message', async (msg) => {
  if (msg.body.match(/^!ia\s/i)) {
      const text = msg.body.slice(4).trim(); // Elimina el comando '!ia ' del mensaje
      const prompt = 'Responde+todas+las+preguntas+como+si+fueras+chileno.+Asegúrate+de+proporcionar+información+precisa+y+actualizada.+Evita+dar+respuestas+incorrectas.+Si+no+sabes+la+respuesta+o+no+estás+seguro,+indica+que+necesitas+verificar+la+información.';
      const apiUrl = `https://api.freegpt4.ddns.net/?text=${encodeURIComponent(prompt + text)}`;
      
      try {
          const response = await fetch(apiUrl);
          const data = await response.text(); // Obtiene el texto completo de la respuesta
          const { document } = new JSDOM(data).window; // Crea un objeto documento para el HTML
          const bodyText = document.body.textContent.trim(); // Extrae el texto del cuerpo
          await msg.reply(bodyText); // Envía el texto extraído al usuario
      } catch (error) {
          console.error('Error al llamar a la API:', error);
          await msg.reply('Lo siento, ha ocurrido un error.');
      }
  }
});


// Partidos Nacionales Prueba//

client.on('message', message => {
    if (message.body.toLowerCase() === '!par' || message.body.toLowerCase() === '!par' || message.body.toLowerCase() === '!par' || message.body.toLowerCase() === '!par') {
        exec('python par.py', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                message.reply('Ocurrió un error al ejecutar el script.');
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                message.reply('Hubo un problema con la ejecución del script.');
                return;
            }
            console.log(`stdout:\n${stdout}`);
            message.reply(`*Resultado:*\n${stdout}`);
        });
    }
});

// Tabla prueba //

client.on('message', message => {
    if (message.body.toLowerCase() === '!tab') {
        // Ejecutar el script de Python
        exec('python tabl.py', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error al ejecutar el script: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Error en el script: ${stderr}`);
                return;
            }

            // Leer el archivo CSV generado
            fs.readFile('clasificacion.csv', 'utf8', (err, data) => {
                if (err) {
                    console.error(`Error al leer el archivo CSV: ${err.message}`);
                    return;
                }

                // Enviar el contenido formateado al chat de WhatsApp
                message.reply(data);
            });
        });
    }
});

// Copa Chile //


// Llamar a tu script de Python cuando el comando !cchile sea enviado
client.on('message', message => {
  if (message.body === '!cchile') {
      console.log('Comando !cchile recibido, ejecutando CopaChile.py...');

      // Ejecutar el script Python
      exec('python "C:\\bots\\AirFryers-bot\\Archivos\\CopaChile.py"', (error, stdout, stderr) => {
          if (error) {
              console.error(`Error al ejecutar el script Python: ${error.message}`);
              message.reply('Hubo un error al obtener los partidos de la Copa Chile.');
              return;
          }
          if (stderr) {
              console.error(`stderr: ${stderr}`);
              message.reply('Hubo un error al obtener los partidos de la Copa Chile.');
              return;
          }

          // Enviar la salida del script como respuesta al usuario en WhatsApp
          console.log(`stdout: ${stdout}`);
          message.reply(stdout);  // Enviar la respuesta obtenida del script Python
      });
  }
});


// Libertadores //

client.on('message', async msg => {
    if (msg.body === '!libertadores') {
        fetchLibertadoresData(msg);
    } else if (msg.body === '!tlibertadores') {
        fetchTablaLibertadoresData(msg);
    }

});

// --- Funciones para manejar los comandos de la Libertadores ---

async function fetchLibertadoresData(msg) {
    try {
        const stdout = await executePythonScript('libertadores.py');
        let formattedMessage = '🏆 *Copa Libertadores 2025 - Partidos:* 🏆\n\n' + formatLibertadores(stdout);
        msg.reply(formattedMessage);
    } catch (error) {
        console.error('Error fetching Libertadores data:', error);
        msg.reply('❌ Error al obtener los partidos.');
    }
}

async function fetchTablaLibertadoresData(msg) {
    try {
        const stdout = await executePythonScript('tlibertadores.py');
        let formattedMessage = '📊 *Copa Libertadores 2025 - Tabla:* 📊\n\n' + formatTablaLibertadores(stdout);
        msg.reply(formattedMessage);
    } catch (error) {
        console.error('Error fetching tabla Libertadores data:', error);
        msg.reply('❌ Error al obtener la tabla.');
    }
}

// --- Función para ejecutar los scripts de Python ---

function executePythonScript(scriptName) {
    return new Promise((resolve, reject) => {
        exec(`python ${scriptName}`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
            }
            resolve(stdout);
        });
    });
}

// --- Funciones de formateo (INCLUIDAS EN index.js) ---

function formatLibertadores(data) {
    let formatted = data.replace(/-- Grupo A --/g, '⚽️ *Grupo A* ⚽️\n')
                      .replace(/-- Grupo E --/g, '\n⚽️ *Grupo E* ⚽️\n')
                      .replace(/\|/g, '*')
                      .replace(/vs/g, '🆚')
                      .replace(/Información no disponible/g, '❓ Info. no disp.');

    formatted = formatted.replace(/U\. de Chile/g, '🔵 U. de Chile 🔴')
                         .replace(/Estudiantes/g, '🦁 Estudiantes 🇦🇷')
                         .replace(/Botafogo/g, '⭐️ Botafogo 🇧🇷')
                         .replace(/Carabobo Futbol Club/g, 'Carabobo 🇻🇪')
                         .replace(/Atletico Bucaramanga/g, '🐆 Bucaramanga 🇨🇴')
                         .replace(/Racing Club/g, '🏁 Racing 🇦🇷')
                         .replace(/Colo Colo/g, '⚪️⚫️ Colo Colo 🤟')
                         .replace(/Fortaleza EC/g, '🦁 Fortaleza 🇧🇷');

    return formatted;
}

function formatTablaLibertadores(data) {
    let formatted = data.replace(/------------------ Tabla Grupos ------------------/g, '')
                      .replace(/----------------------------------------------------/g, '')
                      .replace(/Equipo/g, 'Equip.')
                      .replace(/Dif\. Goles/g, 'Dif. Gol')
                      .trim();

    formatted = formatted.replace(/Grupo A\n/g, '⚽️ *Grupo A* ⚽️\n')
                         .replace(/Grupo E\n/g, '\n⚽️ *Grupo E* ⚽️\n')
                         .replace(/(\d+)\n/g, '$1\n')
                         .replace(/(\-?\d+)\n/g, '$1\n');

    return formatted;
}

// Conecta el cliente a WhatsApp
client.initialize();