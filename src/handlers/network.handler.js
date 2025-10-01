// En: src/handlers/network.handler.js
"use strict";

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');
const geminiService = require('../services/gemini.service.js');

/**
 * Ejecuta el script de Python 'net_analyzer.py', toma su salida técnica,
 * y la envía a Gemini para que la analice y la presente de forma amigable.
 */
async function handleWhoisAnalysis(message) {
    const target = message.body.split(' ')[1];
    if (!target) {
        return message.reply("Por favor, indica un dominio o IP para analizar. Ejemplo: `!whois google.com`");
    }

    await message.react('📡');
    
    // La ruta a tu script de Python
    const scriptPath = path.resolve(__dirname, '..', '..', 'scripts', 'python', 'net_analyzer.py');

    try {
        // 1. Ejecutamos el script de Python y obtenemos su salida técnica (stdout)
        console.log(`(DEBUG) -> Ejecutando net_analyzer.py para: ${target}`);
        const { stdout, stderr } = await exec(`python "${scriptPath}" ${target}`);

        if (stderr && !stdout) { // Si hay un error y no hay salida normal
            console.error(`(net_analyzer.py stderr): ${stderr}`);
            return message.reply(`El script de análisis falló: ${stderr}`);
        }

        const technicalReport = stdout;

        // --- INICIO DE LA MEJORA ---
        // Si el reporte está vacío o es muy corto (menos de 50 caracteres), 
        // significa que no se recolectó casi nada. No molestamos a la IA.
        if (!technicalReport || technicalReport.trim().length < 50) {
            await message.react('🤷');
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
        await message.react('💡');
        return message.reply(friendlyAnalysis);

    } catch (error) {
        console.error("Error al ejecutar handleWhoisAnalysis:", error);
        await message.react('❌');
        // Si el error contiene 'stderr', es probable que el script de Python haya fallado.
        const errorMessage = error.stderr || "Ocurrió un error al ejecutar el análisis. Revisa la consola.";
        return message.reply(errorMessage);
    }
}

module.exports = { handleWhoisAnalysis };