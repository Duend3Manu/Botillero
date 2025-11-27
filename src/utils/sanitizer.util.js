/**
 * Utilidad para sanitizar mensajes antes de enviar a WhatsApp
 * Remueve caracteres problemáticos que WhatsApp no puede procesar
 */
"use strict";

/**
 * Sanitiza un mensaje para asegurar compatibilidad con WhatsApp
 * Remueve caracteres no-ASCII problemáticos pero mantiene:
 * - Saltos de línea (\n)
 * - Formato Markdown básico (*_`)
 * - Caracteres ASCII estándar
 * - Caracteres acentuados latinos (á, é, í, ó, ú, etc)
 * 
 * @param {string} message - El mensaje a sanitizar
 * @returns {string} Mensaje sanitizado
 */
function sanitizeForWhatsApp(message) {
    if (!message || typeof message !== 'string') {
        return '';
    }

    // Remover caracteres problemáticos, mantener ASCII + acentos latinos + \n + markdown
    // \u0080-\u00FF incluye caracteres acentuados latinos (á, é, í, ó, ú, ñ, etc)
    return message
        .replace(/[^\x00-\x7F\u0080-\u00FF\n*_`]/g, '') // ASCII + acentos latinos + saltos + markdown
        .replace(/\u0000/g, '') // Remover null bytes
        .trim();
}

/**
 * Valida que un mensaje sea seguro para enviar a WhatsApp
 * @param {string} message - El mensaje a validar
 * @returns {boolean} True si es seguro
 */
function isValidForWhatsApp(message) {
    if (!message || typeof message !== 'string') {
        return false;
    }

    // Verificar que no tenga caracteres problemáticos
    const problematicChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;
    return !problematicChars.test(message);
}

/**
 * Limpia la salida de scripts Python para WhatsApp
 * @param {string} pythonOutput - Salida del script Python
 * @returns {string} Salida limpia
 */
function cleanPythonOutput(pythonOutput) {
    return sanitizeForWhatsApp(pythonOutput);
}

module.exports = {
    sanitizeForWhatsApp,
    isValidForWhatsApp,
    cleanPythonOutput
};
