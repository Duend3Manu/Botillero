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

function formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + JSON.stringify(args) : '';
    return `[${timestamp}] [${level}] ${message}${formattedArgs}\n`;
}

function writeToFile(message) {
    try {
        // Rotar log si es muy grande
        if (fs.existsSync(LOG_FILE)) {
            const stats = fs.statSync(LOG_FILE);
            if (stats.size > MAX_LOG_SIZE) {
                fs.renameSync(LOG_FILE, `${LOG_FILE}.old`);
            }
        }
        fs.appendFileSync(LOG_FILE, message);
    } catch (err) {
        // Si falla escribir al archivo, solo mostrar en consola
        console.error('Error al escribir en log file:', err.message);
    }
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
