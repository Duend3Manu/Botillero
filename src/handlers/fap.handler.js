"use strict";

const { spawn } = require('child_process'); // Importar spawn
const path = require('path'); // Importar path

/**
 * Maneja la búsqueda de contenido en Fapello.
 * @param {import('whatsapp-web.js').Client} client - El objeto del cliente de WhatsApp.
 * @param {import('whatsapp-web.js').Message} message - El objeto del mensaje de WhatsApp.
 */
async function handleFapSearch(client, message) {
    // Usamos Regex para eliminar el comando (!fap o /fap) sin importar mayúsculas
    const searchTerm = message.body.replace(/^([!/])fap/i, '').trim();

    if (!searchTerm) {
        await client.sendMessage(message.from, `Por favor ingresa un término de búsqueda después de !fap`);
        try { await message.react('❌'); } catch (e) {}
        return;
    }

    try { await message.react('⏳'); } catch (e) {}
    try {
        const pythonScriptPath = path.join(__dirname, '..', '..', 'scripts', 'python', 'fap_search.py');
        const pythonProcess = spawn('python', [pythonScriptPath, searchTerm]);

        let scriptOutput = '';
        let scriptError = '';

        pythonProcess.stdout.on('data', (data) => {
            scriptOutput += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            scriptError += data.toString();
        });

        await new Promise((resolve, reject) => {
            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error(`Python stderr: ${scriptError}`);
                    return reject(new Error(`Python script exited with code ${code}`));
                }
                resolve();
            });
            pythonProcess.on('error', (err) => {
                reject(err);
            });
        });

        if (!scriptOutput.trim()) {
            throw new Error("El script de Python no devolvió datos.");
        }

        const result = JSON.parse(scriptOutput);
        const responseText = result.text;

        await client.sendMessage(message.from, responseText);
        try { await message.react('✅'); } catch (e) {}

    } catch (error) {
        console.error('Error al realizar la búsqueda en Fapello (llamando a Python):', error);
        await client.sendMessage(message.from, `⚠️ Hubo un error al buscar en Fapello. Por favor, intenta nuevamente más tarde.`);
        try { await message.react('❌'); } catch (e) {}
    }
}

module.exports = {
    handleFapSearch
};
