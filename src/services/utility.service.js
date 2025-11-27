// src/services/utility.service.js (Versión con más depuración)
"use strict";

const path = require('path');
const { spawn } = require('child_process');

const SCRIPTS_PATH = path.join(__dirname, '..', '..', 'scripts', 'python');
const PYTHON_EXECUTABLE = 'python';

function executePythonScript(scriptName) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(SCRIPTS_PATH, scriptName);
        const pythonProcess = spawn(PYTHON_EXECUTABLE, ['-u', scriptPath]);
        let output = '';
        let errorOutput = '';
        pythonProcess.stdout.on('data', (data) => { output += data.toString('utf8'); });
        pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString('utf8'); });
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`El script ${scriptName} falló: ${errorOutput}`));
            } else {
                resolve(output.trim());
            }
        });
    });
}

async function getFeriados() {
    return await executePythonScript('feriados.py');
}

async function getRandomInfo() {
    const result = await executePythonScript('random_info.py');
    
    try {
        // El script de Python ahora SIEMPRE devuelve un JSON string.
        const parsedJson = JSON.parse(result);
        return parsedJson;
    } catch (e) {
        console.error("[ERROR utility.service] Falló el parseo del JSON de random_info.py:", e);
        console.error("Salida recibida:", result);
        // Fallback de emergencia
        return { type: 'text', caption: '⚠️ Error interno al procesar el dato aleatorio.' };
    }
}

module.exports = {
    getFeriados,
    getRandomInfo
};