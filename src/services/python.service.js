const { exec } = require('child_process');
const path = require('path');

const PYTHON_SCRIPT_DIR = path.join(__dirname, '..', '..', 'scripts', 'python');

async function executeScript(scriptName, ...args) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(PYTHON_SCRIPT_DIR, scriptName);
        const command = `python ${scriptPath} ${args.map(arg => `"${arg}"`).join(' ')}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return reject({ error: `Error al ejecutar el script Python: ${stderr || error.message}` });
            }
            if (stderr) {
                console.warn(`stderr: ${stderr}`);
            }
            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch (parseError) {
                console.error(`Error al parsear JSON de stdout: ${parseError}`);
                reject({ error: `Error al procesar la respuesta del script Python: ${stdout}` });
            }
        });
    });
}

module.exports = {
    executeScript
};