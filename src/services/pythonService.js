"use strict";

const { spawn } = require('child_process');
const path = require('path');

/**
 * Ejecuta un script Python y devuelve una Promise con { stdout, stderr, code }.
 * - scriptPath: ruta al .py (absoluta o relativa al proyecto)
 * - args: array de argumentos string
 * - opts: {pythonExec} opcional ('python' | 'py' | ruta)
 */
function executeScript(scriptPath, args = [], opts = {}) {
    return new Promise((resolve, reject) => {
        const pythonExec = opts.pythonExec || process.env.PYTHON || 'python';
        const fullPath = path.isAbsolute(scriptPath) ? scriptPath : path.join(process.cwd(), scriptPath);

        const proc = spawn(pythonExec, [fullPath, ...args], { windowsHide: true });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
        proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

        proc.on('error', (err) => {
            return reject(new Error(`python spawn error: ${err.message}`));
        });

        proc.on('close', (code) => {
            // intentar parsear JSON si el script devuelve JSON
            let parsed = null;
            try { parsed = JSON.parse(stdout); } catch (e) { /* no JSON */ }

            resolve({
                code,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                json: parsed
            });
        });
    });
}

module.exports = {
    executeScript
};