// src/services/external.service.js
"use strict";

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');
const geminiService = require('./gemini.service.js'); // Importamos nuestro servicio de IA

/**
 * Función unificada para ejecutar scripts de Python de forma segura.
 * @param {string} scriptName El nombre del script (ej: 'bencina.py').
 * @param {string[]} args Argumentos para pasar al script.
 * @returns {Promise<string>} La salida (stdout) del script.
 */
async function executePythonScript(scriptName, args = []) {
    const scriptPath = path.resolve(__dirname, '..', '..', 'scripts', 'python', scriptName);
    const command = `python "${scriptPath}" ${args.join(' ')}`;
    
    console.log(`(DEBUG) -> Ejecutando comando: ${command}`);
    const { stdout, stderr } = await exec(command, { timeout: 20000 }); // Timeout de 20s

    if (stderr) {
        // Ignoramos los warnings de Wappalyzer que van a stderr pero no son errores fatales.
        if (!stderr.includes("UserWarning: This is an old version of Wappalyzer.")) {
            throw new Error(`Error en script ${scriptName}: ${stderr}`);
        }
    }
    return stdout;
}

async function getBencinaData(comuna) {
    if (!comuna) {
        return "Debes especificar una comuna. Ejemplo: `!bencina santiago`";
    }
    try {
        const bencinaData = await executePythonScript('bencina.py', [comuna]);
        return bencinaData;
    } catch (error) {
        console.error("Error en getBencinaData:", error.message);
        return "No pude obtener los precios de la bencina en este momento.";
    }
}

async function getTransbankStatus() {
    try {
        const stdout = await executePythonScript('transbank.py');

        const statusData = JSON.parse(stdout);
        if (statusData.error) {
            return `Error al obtener datos: ${statusData.error}`;
        }

        // Buscamos si hay algún servicio que NO esté "Operational"
        const problems = Object.entries(statusData).filter(([service, status]) => status !== 'Operational');

        // Si no hay problemas, damos una respuesta simple y rápida. ¡No gastamos IA!
        if (problems.length === 0) {
            return "✅ Todos los servicios de Transbank están operando normalmente.";
        }

        // Si SÍ hay problemas, le pedimos a Gemini que lo explique
        const prompt = `
        Actúa como un ingeniero de soporte técnico que informa a un grupo de amigos.
        El estado de los servicios de Transbank en Chile es el siguiente: ${JSON.stringify(statusData, null, 2)}.
        La palabra "Operational" significa que funciona bien. Cualquier otro estado es un problema.

        Escribe un resumen breve y claro en formato WhatsApp, usando emojis, explicando CUÁLES son los servicios con problemas, cuál es su estado, y qué significa en términos simples para un usuario común (ej: "los pagos online pueden estar lentos", "la app podría no funcionar").
        Termina con una recomendación general.
        `.trim();
        
        console.log(`(DEBUG) -> Se detectaron problemas en Transbank. Pidiendo análisis a Gemini...`);
        const analysis = await geminiService.generateText(prompt);
        return analysis;

    } catch (error) {
        console.error("Error al ejecutar getTransbankStatus:", error);
        return "Ocurrió un error mayor al ejecutar el análisis de Transbank.";
    }
}

async function getBolsaData() {
    try {
        const bolsaData = await executePythonScript('bolsa.py');
        return bolsaData;
    } catch (error) {
        console.error("Error en getBolsaData:", error.message);
        return "No pude obtener los datos de la bolsa en este momento.";
    }
}

module.exports = {
    getBencinaData,
    getTransbankStatus,
    getBolsaData,
};