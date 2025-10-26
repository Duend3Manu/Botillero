"use strict";

const axios = require('axios');
const FormData = require('form-data');
const { spawn } = require('child_process'); // Importar spawn
const path = require('path'); // Importar path

/**
 * Maneja la búsqueda de contenido en Fapello.
 * @param {import('whatsapp-web.js').Client} client - El objeto del cliente de WhatsApp.
 * @param {import('whatsapp-web.js').Message} message - El objeto del mensaje de WhatsApp.
 */
async function handleFapSearch(client, message) {
    const searchTerm = message.body.slice(5).trim();
    const senderId = message.author || message.from; // Use message.author for groups, message.from for direct messages

    if (!searchTerm) {
        await client.sendMessage(message.from, `Por favor ingresa un término de búsqueda después de !fap`);
        await message.react('❌');
        return;
    }

    await message.react('⏳');
    try {
        const pythonScriptPath = path.join(__dirname, '..', '..', 'scripts', 'python', 'fap_search.py');
        const pythonProcess = spawn('python', [pythonScriptPath, searchTerm]);

        let scriptOutput = '';
        pythonProcess.stdout.on('data', (data) => {
            scriptOutput += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`stderr from python script: ${data}`);
        });

        await new Promise((resolve, reject) => {
            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    return reject(new Error(`Python script exited with code ${code}`));
                }
                resolve();
            });
            pythonProcess.on('error', (err) => {
                reject(err);
            });
        });

        const result = JSON.parse(scriptOutput);
        const responseText = result.text;

        await client.sendMessage(message.from, responseText);
        await message.react('✅');

    } catch (error) {
        console.error('Error al realizar la búsqueda en Fapello (llamando a Python):', error);
        await client.sendMessage(message.from, `⚠️ Hubo un error al buscar en Fapello. Por favor, intenta nuevamente más tarde.`);
        await message.react('❌');
    }
}

module.exports = {
    handleFapSearch
};
