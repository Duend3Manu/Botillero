// index.js (VERSIÓN OPTIMIZADA)
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
const { handleMessageCreate } = require('./src/handlers/events.handler');
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

// --- RATE LIMITING GLOBAL ---
const messageTimestamps = new Map();
const rateLimitWarnings = new Map(); // Contador de advertencias por usuario
const GLOBAL_COOLDOWN_MS = botConfig.rateLimiting.globalCooldownMs;
const MAX_WARNINGS = botConfig.rateLimiting.maxWarningsPerUser;

// Limpiar cache de timestamps cada 5 minutos para evitar memory leak
setInterval(() => {
    const now = Date.now();
    for (const [userId, data] of messageTimestamps.entries()) {
        if (now - data.timestamp > 300000) { // 5 minutos
            messageTimestamps.delete(userId);
            rateLimitWarnings.delete(userId);
        }
    }
}, botConfig.rateLimiting.cleanupIntervalMs);

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
    
    // Limpiar cliente anterior
    messageTimestamps.clear();
    
    setTimeout(() => {
        console.log('🔄 Reiniciando cliente...');
        client.initialize().catch(err => {
            console.error('❌ Error al reconectar:', err);
            console.log('💡 Reinicia el bot manualmente si el problema persiste.');
        });
    }, 10000);
});

// --- MANEJADOR DE MENSAJES ---
client.on('message_create', async (message) => {
    const startTime = Date.now();
    
    // Ejecutar handleMessageCreate en paralelo (logging, analytics, etc.)
    handleMessageCreate(client, message).catch(err => {
        console.error('Error en handleMessageCreate:', err.message);
    });
    
    // Solo procesar comandos de usuarios (no del bot mismo)
    if (!message.fromMe && message.body) {
        // Incrementar estadísticas del bot
        incrementStats('message', message.from);
        
        // Guardar mensaje en buffer (solo grupos, solo no-comandos)
        // Esto alimenta el comando !recap
        if (!message.body.startsWith('!')) {
            try {
                const chat = await message.getChat();
                if (chat.isGroup) {
                    const contact = await message.getContact();
                    messageBuffer.addMessage(message.from, {
                        user: contact.pushname || contact.name || contact.number || 'Usuario',
                        userId: message.author || message.from,
                        message: message.body,
                        timestamp: message.timestamp * 1000 // Convertir a ms
                    });
                }
            } catch (e) {
                // No es crítico si falla el buffer
            }
        }
        
        // Si es un comando (empieza con !), incrementar contador de comandos
        if (message.body.startsWith('!')) {
            incrementStats('command', message.from);
        }
        
        try {
            // Procesar TODOS los comandos a través del commandHandler
            // SIN RATE LIMITING - Máxima velocidad
            await commandHandler(client, message);
        } catch (error) {
            console.error(`❌ Error procesando mensaje:`, error.message);
        }
        
        const processingTime = Date.now() - startTime;
        console.log(`⏱️  Comando procesado en ${processingTime}ms`);
    }
});

// --- OTROS EVENTOS ---
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

// Información útil
setTimeout(() => {
    console.log('\n💡 Recordatorio: Usa prefijo ! para comandos: !menu, !sonido, !horoscopo, etc.');
}, 3000);