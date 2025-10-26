// src/services/network.service.js
"use strict";

const path = require('path');
const { spawn } = require('child_process');

const SCRIPTS_PATH = path.join(__dirname, '..', '..', 'scripts', 'python');
const PYTHON_EXECUTABLE = 'python';

function analyzeDomain(domain) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(SCRIPTS_PATH, 'net_analyzer.py');
        const pythonProcess = spawn(PYTHON_EXECUTABLE, ['-u', scriptPath, domain]);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Error al ejecutar net_analyzer.py:`, errorOutput);
                reject(new Error('El script de análisis de red falló.'));
            } else {
                resolve(output.trim());
            }
        });
    });
}

module.exports = {
    analyzeDomain
};