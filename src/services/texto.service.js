// src/services/texto.service.js
"use strict";

const path = require('path');
const { spawn } = require('child_process');

const SCRIPTS_PATH = path.join(__dirname, '..', '..', 'scripts', 'python');
const PYTHON_EXECUTABLE = 'python';

function addTextToImage(imagePath, topText, bottomText) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(SCRIPTS_PATH, 'texto.py');
        const pythonProcess = spawn(PYTHON_EXECUTABLE, ['-u', scriptPath, imagePath, topText, bottomText]);

        let outputPath = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => { outputPath += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Error al ejecutar texto.py:`, errorOutput);
                reject(new Error('El script de Python para agregar texto falló.'));
            } else {
                resolve(outputPath.trim());
            }
        });
    });
}

module.exports = {
    addTextToImage
};