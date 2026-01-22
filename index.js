// index.js (VERSIÓN FINAL DE PRODUCCIÓN)
"use strict";

// --- ¡IMPORTANTE! Carga las variables de entorno desde .env ---
// Debe ser la primera línea para que las variables estén disponibles en todo el proyecto.
require('dotenv').config();

// --- Manejo de Errores Globales ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection en:', promise, 'razón:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // No hacer process.exit() para que el bot siga funcionando
});

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const commandHandler = require('./src/handlers/command.handler');
const { handleMessageCreate, handleMessageUpdate, handleMessageRevoke } = require('./src/handlers/events.handler');
const { handlePing } = require('./src/handlers/system.handler');
const express = require('express');

console.log("Iniciando Botillero v2.0 (Arquitectura Modular)...");

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('Escanea el código QR con tu teléfono para conectar.');
});

client.on('ready', () => {
    console.log('¡Cliente de WhatsApp conectado y listo para la acción!');
});

// --- MANEJADORES DE EVENTOS ---
// Combinamos message_create con commandHandler para evitar duplicación
client.on('message_create', async (message) => {
    await handleMessageCreate(client, message);
    // Solo procesamos comandos de usuarios, no de mensajes del bot
    if (!message.fromMe) {
        if (message.body.toLowerCase() === '!ping') {
            const response = await handlePing(message);
            await message.reply(response);
        } else {
            await commandHandler(client, message);
        }
    }
});

client.on('message_revoke_everyone', (after, before) => handleMessageRevoke(client, after, before));
client.on('message_update', message => handleMessageUpdate(client, message));

// --- SERVIDOR DE NOTIFICACIONES ---
const app = express();
app.use(express.json());

const NOTIFICATION_PORT = process.env.NOTIFICATION_PORT || 3001;
const GROUP_ID = process.env.NOTIFICATION_GROUP_ID || '56933400670-1571689305@g.us'; 

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

// --- CIERRE ELEGANTE (Graceful Shutdown) ---
process.on('SIGINT', async () => {
    console.log('(SIGINT) -> Cerrando cliente y liberando recursos...');
    try {
        await client.destroy();
    } catch (e) {
        console.error('Error al cerrar cliente:', e);
    }
    process.exit(0);
});

// Iniciar el cliente
client.initialize();