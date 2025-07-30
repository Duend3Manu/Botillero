// src/services/league.service.js (VERSIÓN FINAL Y CORRECTA)
"use strict";

const path = require('path');
const { spawn } = require('child_process');

// Ruta a la carpeta donde guardas tus scripts de Python
const SCRIPTS_PATH = path.join(__dirname, '..', '..', 'scripts', 'python');
// Comando para ejecutar Python (usualmente 'python' o 'python3')
const PYTHON_EXECUTABLE = 'python'; 

/**
 * Función genérica para ejecutar cualquier script de Python y devolver su salida.
 * @param {string} scriptName El nombre del archivo .py a ejecutar.
 * @returns {Promise<string>} La salida del script.
 */
function executePythonScript(scriptName) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(SCRIPTS_PATH, scriptName);
        const pythonProcess = spawn(PYTHON_EXECUTABLE, ['-u', scriptPath]);

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

// --- NUEVA FUNCIÓN PARA !partidos ---
async function getMatchDaySummary() {
    console.log(`(Servicio) -> Ejecutando partidos.py...`);
    return await executePythonScript('partidos.py');
}

module.exports = {
    getLeagueTable,
    getLeagueUpcomingMatches,
    getMatchDaySummary // Exportamos la nueva función junto a las antiguas
};