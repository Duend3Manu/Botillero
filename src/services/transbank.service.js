// src/services/transbank.service.js
"use strict";

const { spawn } = require('child_process');
const path = require('path');
const { explainTransbankStatusWithAI } = require('./ai.service');

const PYTHON_EXECUTABLE = 'py';
const SCRIPT_PATH = path.join(__dirname, '..', '..', 'scripts', 'python', 'transbank.py');

async function getTransbankStatus() {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn(PYTHON_EXECUTABLE, ['-u', SCRIPT_PATH]);

        let rawData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => { rawData += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorData += data.toString(); });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error(`Error en transbank.py: ${errorData}`);
                return reject(new Error('Falló el script de Python para Transbank.'));
            }

            try {
                const statusData = JSON.parse(rawData);
                if (statusData.error) {
                    return resolve(statusData.error);
                }

                const failingServices = Object.entries(statusData)
                    .filter(([service, status]) => status !== 'Operational');

                if (failingServices.length === 0) {
                    resolve('✅ ¡Wena! Todos los servicios de Transbank están operativos.');
                } else {
                    const explanation = await explainTransbankStatusWithAI(Object.fromEntries(failingServices));
                    resolve(explanation);
                }
            } catch (parseError) {
                reject(new Error('No se pudo interpretar la respuesta del script de Transbank.'));
            }
        });
    });
}

module.exports = { getTransbankStatus };