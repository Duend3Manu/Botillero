// src/services/utility.service.js (Versión que entiende JSON)
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
                reject(new Error(`El script ${scriptName} falló.`));
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
        // Intentamos parsear como JSON. Si funciona, es un mensaje con imagen.
        return JSON.parse(result);
    } catch (e) {
        // Si no es JSON, es un mensaje de texto normal.
        return result;
    }
}

module.exports = {
    getFeriados,
    getRandomInfo
};