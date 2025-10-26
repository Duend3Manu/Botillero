const { spawn } = require('child_process');
const path = require('path');

const PYTHON_COMMAND = process.platform === 'win32' ? 'python' : 'python3';

function executeScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'python', scriptName);
    const pythonProcess = spawn(PYTHON_COMMAND, [scriptPath, ...args]);

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
        console.error(`Error en script de Python (${scriptName}): ${errorOutput}`);
        reject(new Error(`El script de Python finalizó con código ${code}.`));
      } else {
        resolve(output.trim());
      }
    });

    pythonProcess.on('error', (err) => {
        console.error(`Fallo al iniciar el script (${scriptName}):`, err);
        reject(err);
    });
  });
}

module.exports = { executeScript };