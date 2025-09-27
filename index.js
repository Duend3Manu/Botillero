// index.js (VERSIÓN FINAL DE PRODUCCIÓN)
"use strict";

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const commandHandler = require('./src/handlers/command.handler');
const { handleMessageCreate, handleMessageUpdate, handleMessageRevoke } = require('./src/handlers/events.handler');
const express = require('express');

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
client.on('message', message => commandHandler(client, message));
client.on('message_create', message => handleMessageCreate(message));
// LÍNEA CORREGIDA:
client.on('message_revoke_everyone', (after, before) => handleMessageRevoke(client, after, before));
client.on('message_update', message => handleMessageUpdate(client, message));

// --- SERVIDOR DE NOTIFICACIONES ---
const app = express();
app.use(express.json());

const NOTIFICATION_PORT = 3001;
const GROUP_ID = '56933400670-1571689305@g.us'; 

app.post('/send-notification', (req, res) => {
    const message = req.body.message;
    if (message) {
        console.log(`(API) -> Mensaje recibido de Python: "${message}"`);
        client.sendMessage(GROUP_ID, message);
        res.status(200).send({ status: 'ok', message: 'Notificación enviada al grupo.' });
    } else {
        res.status(400).send({ status: 'error', message: 'No se recibió ningún mensaje.' });
    }
});

app.listen(NOTIFICATION_PORT, () => {
    console.log(`(API) -> Servidor de notificaciones escuchando en el puerto ${NOTIFICATION_PORT}`);
});

// Iniciar el cliente
client.initialize();