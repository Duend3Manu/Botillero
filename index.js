// index.js (NUEVA VERSIÓN MULTI-BOT)
"use strict";

// 1. Carga las variables de entorno ANTES que cualquier otro módulo.
require('dotenv').config();

// 2. Importaciones de módulos
const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const commandHandler = require('./src/handlers/command.handler');
const { handleMessageCreate, handleMessageUpdate, handleMessageRevoke } = require('./src/handlers/events.handler');
const express = require('express');

// 3. Cargar configuración del bot desde argumentos de línea de comando
const botName = process.argv[2];
if (!botName) {
    console.error("❌ Error: Debes especificar el nombre del bot al iniciar. Ejemplo: `npm run botillero` o `node index.js botillero`");
    process.exit(1);
}

const configPath = path.join(__dirname, 'config', `${botName}.json`);
if (!fs.existsSync(configPath)) {
    console.error(`❌ Error: No se encontró el archivo de configuración en: ${configPath}`);
    process.exit(1);
}

const config = require(configPath);
console.log(`🚀 Iniciando bot: ${config.botName} (Arquitectura Multi-Bot)...`);

const client = new Client({
    authStrategy: new LocalAuth({ clientId: config.clientId }),
    puppeteer: { 
        headless: true, 
        args: ['--no-sandbox'] 
    }
});

// --- MANEJADORES DE CLIENTE WHATSAPP ---
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log(`[${config.botName}] Escanea el código QR con tu teléfono para conectar.`);
});

client.on('ready', () => {
    console.log(`[${config.botName}] ¡Cliente de WhatsApp conectado y listo para la acción!`);
});

// --- MANEJADORES DE EVENTOS ---
// Pasamos el objeto 'config' al commandHandler
client.on('message', message => commandHandler(client, message, config));
client.on('message_create', message => handleMessageCreate(message));
client.on('message_revoke_everyone', (after, before) => handleMessageRevoke(client, after, before));
client.on('message_update', message => handleMessageUpdate(client, message));

// --- SERVIDOR DE NOTIFICACIONES ---
const app = express();
app.use(express.json());

const NOTIFICATION_PORT = 3001;

app.post('/send-notification', (req, res) => {
    const message = req.body.message;
    if (message) {
        console.log(`[API - ${config.botName}] -> Mensaje recibido: "${message}"`);
        client.sendMessage(config.notificationGroupId, message);
        res.status(200).send({ status: 'ok', message: 'Notificación enviada al grupo.' });
    } else {
        res.status(400).send({ status: 'error', message: 'No se recibió ningún mensaje.' });
    }
});

app.listen(NOTIFICATION_PORT, () => {
    console.log(`[API] -> Servidor de notificaciones escuchando en el puerto ${NOTIFICATION_PORT}`);
});

// Iniciar el cliente
client.initialize();