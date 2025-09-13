"use strict";

const { spawn } = require('child_process');
const path = require('path');

/**
 * Ejecuta un script de Python y devuelve su salida.
 * @param {string} scriptName - El nombre del archivo del script en la carpeta 'scripts/python'.
 * @param {string[]} args - Una lista de argumentos para pasar al script.
 * @returns {Promise<string>} La salida estándar del script.
 */
function executePythonScript(scriptName, args = []) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'python', scriptName);
        
        // --- ¡LA CORRECCIÓN CLAVE! ---
        // Le decimos a Node.js que la salida de este proceso debe ser interpretada como texto UTF-8.
        const pythonProcess = spawn('python', [scriptPath, ...args], { encoding: 'utf8' });

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                // Si hay un error, lo rechazamos para que el handler pueda atraparlo.
                console.error(`Error al ejecutar ${scriptName}: ${errorOutput}`);
                reject(new Error(errorOutput || `El script ${scriptName} terminó con el código ${code}`));
            } else {
                resolve(output.trim());
            }
        });

        pythonProcess.on('error', (err) => {
            console.error(`Error al iniciar el script ${scriptName}:`, err);
            reject(err);
        });
    });
}

module.exports = {
    executePythonScript
};