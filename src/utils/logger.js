// src/utils/logger.js
"use strict";

const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

const LOG_FILE = path.join(__dirname, '..', '..', 'bot.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

// Contador para optimizar las verificaciones de disco
let writeCounter = 0;

function formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + JSON.stringify(args) : '';
    return `[${timestamp}] [${level}] ${message}${formattedArgs}\n`;
}

function checkRotation() {
    // Verificamos el tamaño de forma asíncrona
    fs.stat(LOG_FILE, (err, stats) => {
        if (err) return; // Si el archivo no existe, no hacemos nada

        if (stats.size > MAX_LOG_SIZE) {
            try {
                // Rotación síncrona (bloqueante) pero segura, ocurre muy rara vez
                fs.renameSync(LOG_FILE, `${LOG_FILE}.old`);
            } catch (e) {
                console.error('Error al rotar logs:', e.message);
            }
        }
    });
}

function writeToFile(message) {
    // 1. Optimización: Solo verificar rotación cada 50 escrituras
    // Esto evita golpear el disco con fs.stat() en cada mensaje
    writeCounter = (writeCounter + 1) % 50;
    if (writeCounter === 0) {
        checkRotation();
    }

    // 2. Optimización: Escritura Asíncrona (Non-blocking)
    // fs.appendFileSync bloqueaba el bot mientras escribía en disco.
    // fs.appendFile lo hace en segundo plano.
    fs.appendFile(LOG_FILE, message, (err) => {
        if (err) {
            console.error('Error crítico escribiendo en log:', err.message);
        }
    });
}

function log(level, message, ...args) {
    const formattedMessage = formatMessage(level, message, ...args);
    
    // Escribir en consola
    switch (level) {
        case LOG_LEVELS.ERROR:
            console.error(formattedMessage.trim());
            break;
        case LOG_LEVELS.WARN:
            console.warn(formattedMessage.trim());
            break;
        default:
            console.log(formattedMessage.trim());
    }
    
    // Escribir en archivo
    writeToFile(formattedMessage);
}

module.exports = {
    error: (message, ...args) => log(LOG_LEVELS.ERROR, message, ...args),
    warn: (message, ...args) => log(LOG_LEVELS.WARN, message, ...args),
    info: (message, ...args) => log(LOG_LEVELS.INFO, message, ...args),
    debug: (message, ...args) => log(LOG_LEVELS.DEBUG, message, ...args)
};
