// En: src/services/metro.service.js
"use strict";

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');
const geminiService = require('./gemini.service.js');

async function getMetroStatus(message) { // <-- Ahora recibe 'message'
    const scriptPath = path.resolve(__dirname, '..', '..', 'scripts', 'python', 'metro.py');

    try {
        await message.react('🚇');
        console.log(`(DEBUG) -> Ejecutando metro.py...`);
        const { stdout, stderr } = await exec(`python "${scriptPath}"`);

        if (stderr) {
            console.error(`(metro.py stderr): ${stderr}`);
            return `El script de Metro falló: ${stderr}`;
        }
        
        const technicalReport = stdout;

        if (technicalReport.includes("Toda la red del metro está operativa") && !technicalReport.includes("problemas")) {
            await message.react('✅');
            // Añadimos una comprobación rápida para el estado de EFE también
            if (technicalReport.includes("no operativo")) {
                 // Si EFE tiene problemas, mejor que lo analice la IA
            } else {
                 return "✅ ¡Buenas noticias! Toda la red de Metro y Trenes EFE se encuentra operativa.";
            }
        }
        
        console.log(`(DEBUG) -> Novedades detectadas. Pidiendo análisis a Gemini...`);
        
        // --- PROMPT MEJORADO PARA INCLUIR TRENES ---
        const prompt = `
        Actúa como el Community Manager de la red de transporte de Santiago para un chat de WhatsApp.
        Te daré un reporte técnico con el estado de los trenes de EFE y del Metro de Santiago.
        Tu misión es crear un único informe consolidado, amigable y claro.

        Instrucciones:
        1.  **Primero, busca la sección "Estado de Trenes (EFE)".** Resume el estado de "Tren Nos" y "Tren Rancagua". Usa un emoji de tren 🚆.
        2.  **Segundo, analiza el estado del "Metro de Santiago".** Si todo está operativo, dilo en una frase. Si hay estaciones con problemas, lístalas de forma clara. Usa un emoji de metro 🚇.
        3.  **Finalmente, escribe una conclusión general** y una recomendación como "¡Planifica tu viaje!".

        Reporte Técnico:
        ---
        ${technicalReport}
        ---

        Ahora, genera tu informe consolidado para WhatsApp.
        `.trim();

        const analysis = await geminiService.generateText(prompt);
        await message.react('💡');
        return analysis;

    } catch (error) {
        console.error("Error al ejecutar getMetroStatus:", error);
        await message.react('❌');
        return "Ocurrió un error mayor al ejecutar el análisis de la red de transporte.";
    }
}

module.exports = {
    getMetroStatus
};