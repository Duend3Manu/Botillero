"use strict";

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const commandHandler = require('./src/handlers/command.handler');
const { adaptWhatsappMessage } = require('./src/platforms/whatsapp.adapter'); // <-- ¡Importamos el adaptador!
const express = require('express');

console.log("Iniciando Botillero v2.0 (Arquitectura Híbrida)...");

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox'] }
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('¡Cliente de WhatsApp conectado y listo para la acción!');
});

// --- MANEJADOR DE MENSAJES CON ADAPTADOR ---
client.on('message', async (message) => {
    try {
        // 1. Adaptamos el mensaje de WhatsApp a nuestro formato universal
        const adaptedMessage = await adaptWhatsappMessage(client, message);
        
        // 2. Pasamos el mensaje adaptado al commandHandler
        if (adaptedMessage) {
            await commandHandler(adaptedMessage);
        }
    } catch (error) {
        console.error("Error al procesar el mensaje de WhatsApp:", error);
    }
});

// --- SERVIDOR DE NOTIFICACIONES (Sin cambios) ---
const app = express();
app.use(express.json());
const NOTIFICATION_PORT = process.env.PORT || 3001;
// Asegúrate de tener GROUP_ID en tu .env o defínelo aquí
const GROUP_ID = process.env.GROUP_ID || 'TU_GROUP_ID@g.us'; 

app.post('/send-notification', (req, res) => {
    const message = req.body.message;
    if (message) {
        client.sendMessage(GROUP_ID, message);
        res.status(200).send({ status: 'ok', message: 'Notificación enviada.' });
    } else {
        res.status(400).send({ status: 'error', message: 'No se recibió mensaje.' });
    }
});

app.listen(NOTIFICATION_PORT, () => {
    console.log(`(API) -> Servidor de notificaciones escuchando en el puerto ${NOTIFICATION_PORT}`);
});

client.initialize();
