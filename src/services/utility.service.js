// src/services/utility.service.js
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
        pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Error al ejecutar ${scriptName}:`, errorOutput);
                reject(new Error(`El script de Python (${scriptName}) falló.`));
            } else {
                resolve(output.trim());
            }
        });
    });
}

async function getFeriados() {
    return await executePythonScript('feriados.py');
}

module.exports = {
    getFeriados
};