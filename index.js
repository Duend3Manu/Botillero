// index.js (VERSIÓN FINAL DE PRODUCCIÓN)
"use strict";

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const commandHandler = require('./src/handlers/command.handler');
const { handleMessageCreate, handleMessageUpdate, handleMessageRevoke } = require('./src/handlers/events.handler');

console.log("Iniciando Botillero v2.0 (Arquitectura Modular)...");

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox'] }
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('Escanea el código QR con tu teléfono para conectar.');
});

client.on('ready', () => {
    console.log('¡Cliente de WhatsApp conectado y listo para la acción!');
});

// --- MANEJADORES DE EVENTOS ---

// 1. Cuando se recibe un mensaje (para comandos y palabras clave)
client.on('message', message => commandHandler(client, message));

// 2. Cuando se crea un mensaje (para el detector de editados/borrados)
client.on('message_create', message => handleMessageCreate(message));

// 3. Cuando se borra un mensaje
client.on('message_revoke_everyone', (after, before) => handleMessageRevoke(client, after, before));

// 4. Cuando se edita un mensaje
client.on('message_update', message => handleMessageUpdate(client, message));

// Iniciar el cliente
client.initialize();