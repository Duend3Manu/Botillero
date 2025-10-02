// En: src/handlers/network.handler.js
"use strict";

const pythonService = require('../services/python.service');
const geminiService = require('../services/gemini.service.js');
const { safeReact } = require('../utils/reaction.util');

/**
 * Ejecuta el script de Python 'net_analyzer.py', toma su salida técnica,
 * y la envía a Gemini para que la analice y la presente de forma amigable.
 */
async function handleWhoisAnalysis(message) {
    const target = message.body.split(' ')[1];
    if (!target) {
        return message.reply("Por favor, indica un dominio o IP para analizar. Ejemplo: `!whois google.com`");
    }

    await safeReact(message, '📡');

    try {
        // 1. Ejecutamos el script de Python y obtenemos su salida técnica (stdout)
        console.log(`(DEBUG) -> Ejecutando net_analyzer.py para: ${target}`);
        const { stdout: technicalReport } = await pythonService.executePythonScript('net_analyzer.py', [target]);

        // Si el reporte está vacío o es muy corto (menos de 50 caracteres), 
        // significa que no se recolectó casi nada. No molestamos a la IA.
        if (!technicalReport || technicalReport.trim().length < 50) {
            await safeReact(message, '🤷');
            return message.reply(`No se pudo recolectar suficiente información para analizar *"${target}"*. Es probable que el dominio esté muy protegido o no exista.`);
        }
        // --- FIN DE LA MEJORA ---
        console.log(`(DEBUG) -> Reporte técnico recibido, enviando a Gemini para análisis...`);
        // 2. Creamos un prompt para que Gemini analice el reporte (ahora con la seguridad de que hay datos)
        const prompt = `
        Actúa como un analista de ciberseguridad que explica un reporte a un amigo.
        Te daré un reporte técnico sobre un dominio y quiero que lo resumas en un lenguaje simple, con emojis y en formato para WhatsApp.
        Destaca los puntos más importantes (buenos y malos) y da una conclusión general. Si hay errores como "timed out" o "conexión denegada", explícalos de forma sencilla.

        Este es el reporte técnico:
        ---
        ${technicalReport}
        ---

        Ahora, genera tu análisis amigable.
        `.trim();

        // 3. Enviamos el reporte a Gemini para que lo "traduzca"
        const friendlyAnalysis = await geminiService.generateText(prompt);

        // 4. Enviamos el análisis de la IA al usuario
        await safeReact(message, '💡');
        return message.reply(friendlyAnalysis);

    } catch (error) {
        console.error("Error al ejecutar handleWhoisAnalysis:", error);
        await safeReact(message, '❌');
        // El servicio de Python ya registra el error detallado en la consola.
        return message.reply("Ocurrió un error al ejecutar el análisis. Revisa la consola para más detalles.");
    }
}

module.exports = { handleWhoisAnalysis };