// src/services/banner.service.js
"use strict";

const path = require('path');
const { spawn } = require('child_process');

const SCRIPTS_PATH = path.join(__dirname, '..', '..', 'scripts', 'python');
const PYTHON_EXECUTABLE = 'python';

function createBanner(style, text) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(SCRIPTS_PATH, 'banner.py');
        const pythonProcess = spawn(PYTHON_EXECUTABLE, ['-u', scriptPath, style, text]);

        let outputPath = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => { outputPath += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Error al ejecutar banner.py:`, errorOutput);
                // Devolvemos el mensaje de error de Python para que el usuario lo vea
                reject(new Error(errorOutput.trim() || 'El script de Python para crear banners falló.'));
            } else {
                resolve(outputPath.trim());
            }
        });
    });
}

module.exports = {
    createBanner
};