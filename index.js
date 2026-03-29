// index.js (VERSIÓN WHATSAPP)
"use strict";

require('dotenv').config();

// --- Manejo de Errores Globales ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection en:', promise, 'razón:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleMessageCreate, handleMessageRevoke, handleMessageUpdate } = require('./src/handlers/events.handler');
const commandHandler = require('./src/handlers/command.handler');
const { incrementStats } = require('./src/handlers/system.handler');
const messageBuffer = require('./src/services/message-buffer.service');
const botConfig = require('./config/bot.config');

console.log("🚀 Iniciando Botillero v2.0...");

// --- CONFIGURACIÓN DEL CLIENTE ---
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: botConfig.authStrategy.clientId,
        dataPath: botConfig.authStrategy.dataPath
    }),
    puppeteer: botConfig.puppeteer
});

// --- EVENTOS DE CONEXIÓN ---
client.on('qr', qr => {
    console.log('📱 QR listo para escanear:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ ¡Bot conectado y listo!');
});

client.on('auth_failure', msg => {
    console.error('❌ Error de autenticación:', msg);
});

client.on('disconnected', (reason) => {
    console.log('⚠️  Bot desconectado:', reason);
    console.log('🔄 Intentando reconectar en 10 segundos...');
    
    setTimeout(() => {
        console.log('🔄 Reiniciando cliente...');
        client.initialize().catch(err => {
            console.error('❌ Error al reconectar:', err);
        });
    }, 10000);
});

// --- MANEJADOR DE MENSAJES ---
client.on('message_create', async (message) => {
    const startTime = Date.now();
    
    if (!message.body) return;

    // Evitar auto-respuestas infinitas a frases normales, pero permitir probar comandos (!)
    if (message.fromMe && !message.body.startsWith('!')) return;

    // Ejecutar handleMessageCreate para logging/analytics
    handleMessageCreate(client, message).catch(err => {
        console.error('Error en handleMessageCreate:', err.message);
    });
    
    // Procesar mensajes (incluyendo los del bot para pruebas si empieza con !)
    incrementStats('message', message.from);
    
    // Guardar mensaje en buffer para !recap
    if (!message.body.startsWith('!')) {
        try {
            const chat = await message.getChat();
            if (chat.isGroup) {
                const contact = await message.getContact();
                messageBuffer.addMessage(message.from, {
                    user: contact.pushname || contact.name || contact.number || 'Usuario',
                    userId: message.author || message.from,
                    message: message.body,
                    timestamp: message.timestamp * 1000
                });
            }
        } catch (e) {}
    }
    
    // Procesar comandos y frases (Ester eggs, etc.)
    try {
        if (message.body.startsWith('!')) {
            incrementStats('command', message.from);
        }
        await commandHandler(client, message);
    } catch (error) {
        console.error(`❌ Error procesando mensaje:`, error.message);
    }
    
    const processingTime = Date.now() - startTime;
    if (message.body.startsWith('!')) {
        console.log(`⏱️  Comando procesado en ${processingTime}ms`);
    }
});

client.on('message_revoke_everyone', (after, before) => handleMessageRevoke(client, after, before));
client.on('message_update', message => handleMessageUpdate(client, message));

// --- CIERRE ELEGANTE ---
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando bot...');
    try {
        await client.destroy();
        console.log('✅ Cliente cerrado correctamente.');
    } catch (e) {
        console.error('❌ Error al cerrar cliente:', e);
    }
    process.exit(0);
});

// --- INICIAR CLIENTE ---
client.initialize();

setTimeout(() => {
    console.log('\n💡 Recordatorio: Usa prefijo ! para comandos: !menu, !sonido, !horoscopo, etc.');
}, 3000);