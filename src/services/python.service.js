"use strict";

const { spawn } = require('child_process');
const path = require('path');

// Detectar el comando Python correcto automáticamente
const PYTHON_COMMAND = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

/**
 * Ejecuta un script Python y devuelve una Promise con { stdout, stderr, code, json }.
 * @param {string} scriptName - Nombre del archivo .py (se busca en scripts/python/)
 * @param {Array} args - Argumentos para pasar al script
 * @param {Object} opts - Opciones: {pythonExec, timeout}
 * @returns {Promise<{code, stdout, stderr, json}>}
 */
function executeScript(scriptName, args = [], opts = {}) {
    return new Promise((resolve, reject) => {
        const pythonExec = opts.pythonExec || PYTHON_COMMAND;
        const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'python', scriptName);
        
        // Agregamos '-u' para forzar salida sin buffer (importante para logs en tiempo real y evitar cortes)
        const proc = spawn(pythonExec, ['-u', scriptPath, ...args], { 
            windowsHide: true,
            timeout: opts.timeout || 30000 // 30 segundos por defecto
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
        proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

        proc.on('error', (err) => {
            console.error(`Error al ejecutar script Python (${scriptName}):`, err.message);
            return reject(new Error(`Python spawn error: ${err.message}`));
        });

        proc.on('close', (code, signal) => {
            // Si code es null, fue matado por señal (ej: timeout)
            const finalCode = code !== null ? code : (signal ? 1 : 0);

            if (finalCode !== 0 && stderr) {
                console.error(`Error en script Python (${scriptName}) [Code: ${finalCode}, Signal: ${signal}]: ${stderr}`);
            }

            // Intentar parsear JSON si el script devuelve JSON
            let parsed = null;
            try { 
                parsed = JSON.parse(stdout); 
            } catch (e) { 
                /* No es JSON, es normal */ 
            }

            resolve({
                code: finalCode,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                json: parsed
            });
        });
    });
}

module.exports = { executeScript };