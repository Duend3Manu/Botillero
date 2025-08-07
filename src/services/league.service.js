// src/services/league.service.js (Versión con codificación corregida)
"use strict";

const path = require('path');
const { spawn } = require('child_process');

const SCRIPTS_PATH = path.join(__dirname, '..', '..', 'scripts', 'python');
const PYTHON_EXECUTABLE = 'python'; 

/**
 * Función genérica para ejecutar cualquier script de Python.
 * @param {string} scriptName El nombre del archivo .py a ejecutar.
 * @returns {Promise<string>} La salida del script.
 */
function executePythonScript(scriptName) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(SCRIPTS_PATH, scriptName);
        const pythonProcess = spawn(PYTHON_EXECUTABLE, ['-u', scriptPath]);

        let output = '';
        let errorOutput = '';

        // CAMBIO CLAVE: Le decimos que lea la salida como 'utf8'
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString('utf8');
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString('utf8');
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Error al ejecutar el script ${scriptName}:`, errorOutput);
                reject(new Error(`El script de Python (${scriptName}) finalizó con errores.`));
            } else {
                resolve(output.trim());
            }
        });
    });
}

// --- Funciones para cada comando de fútbol ---

async function getLeagueTable() {
    console.log(`(Servicio) -> Ejecutando tabla.py...`);
    return await executePythonScript('tabla.py');
}

async function getLeagueUpcomingMatches() {
    console.log(`(Servicio) -> Ejecutando proxpar.py...`);
    return await executePythonScript('proxpar.py');
}

async function getMatchDaySummary() {
    console.log(`(Servicio) -> Ejecutando partidos.py...`);
    return await executePythonScript('partidos.py');
}

module.exports = {
    getLeagueTable,
    getLeagueUpcomingMatches,
    getMatchDaySummary
};