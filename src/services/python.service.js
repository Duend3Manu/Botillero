const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');

/**
 * Función unificada para ejecutar scripts de Python de forma segura usando el entorno virtual.
 * @param {string} scriptName El nombre del script (ej: 'metro.py').
 * @param {string[]} args Argumentos para pasar al script.
 * @returns {Promise<{stdout: string, stderr: string}>} La salida (stdout) y error (stderr) del script.
 */
async function executePythonScript(scriptName, args = []) {
    // Construimos la ruta al ejecutable de Python DENTRO del entorno virtual
    const pythonExecutable = path.resolve(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe');

    const scriptPath = path.resolve(__dirname, '..', '..', 'scripts', 'python', scriptName);
    
    // Usamos la ruta completa al Python del .venv
    const command = `"${pythonExecutable}" "${scriptPath}" ${args.join(' ')}`;
    
    console.log(`(DEBUG) -> Ejecutando comando: ${command}`);

    try {
        // Ejecutamos y esperamos la salida
        const { stdout, stderr } = await exec(command, { timeout: 30000 }); // Timeout de 30s
        return { stdout, stderr };
    } catch (error) {
        // Si el proceso de Python falla, el error a menudo contiene stdout y stderr
        console.error(`Error al ejecutar el script de Python (${scriptName}):`, error);
        throw new Error(`El script de Python finalizó con un error: ${error.stderr || error.message}`);
    }
}

module.exports = {
    executePythonScript
};