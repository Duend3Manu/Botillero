// En: src/services/metro.service.js
"use strict";

const pythonService = require('./python.service.js'); // <-- Importamos nuestro nuevo servicio
const geminiService = require('./gemini.service.js');
const { safeReact } = require('../utils/reaction.util');

async function getMetroStatus(message) { // <-- Ahora recibe 'message'
    try {
        await safeReact(message, '🚇');
        
        // --- INICIO DEL CAMBIO ---
        // Ya no usamos 'exec', llamamos a nuestra función centralizada
        const { stdout, stderr } = await pythonService.executePythonScript('metro.py');
        // --- FIN DEL CAMBIO ---

        if (stderr) {
            console.error(`(metro.py stderr): ${stderr}`);
            return `El script de Metro falló: ${stderr}`;
        }
        
        const technicalReport = stdout;

        if (technicalReport.includes("Toda la red del metro está operativa") && !technicalReport.includes("no operativo")) {
            await safeReact(message, '✅');
            return "✅ ¡Buenas noticias! Toda la red de Metro y Trenes EFE se encuentra operativa.";
        }
        
        console.log(`(DEBUG) -> Novedades detectadas. Pidiendo análisis a Gemini...`);
        
        const prompt = `
        Actúa como el Community Manager de Metro de Santiago...
        (Tu prompt de Gemini se mantiene igual)
        ---
        ${technicalReport}
        ---
        Ahora, genera el estado de la red para WhatsApp.
        `.trim();

        const analysis = await geminiService.generateText(prompt);
        await safeReact(message, '💡');
        return analysis;

    } catch (error) {
        console.error("Error al ejecutar getMetroStatus:", error);
        await safeReact(message, '❌');
        return "Ocurrió un error mayor al ejecutar el análisis del Metro.";
    }
}

module.exports = {
    getMetroStatus
};