// src/services/external.service.js
"use strict";

const pythonService = require('./python.service');
const { cleanPythonOutput } = require('../utils/sanitizer.util');

async function getBencinaData(comuna) {
    if (!comuna) {
        return "Debes especificar una comuna. Ejemplo: `!bencina santiago`";
    }
    try {
        console.log(`(Servicio Externo) -> Ejecutando bencina.py para ${comuna}...`);
        const result = await pythonService.executeScript('bencina.py', [comuna]);
        
        // Sanitizar para WhatsApp
        let bencinaData = cleanPythonOutput(result.stdout);
        
        if (!bencinaData) {
            console.error(`bencina.py stderr: ${result.stderr}`);
            return `No se encontraron datos de bencina para "${comuna}".`;
        }
        
        return bencinaData;
    } catch (error) {
        console.error("Error en getBencinaData:", error.message);
        return "No pude obtener los precios de la bencina en este momento.";
    }
}

async function getTraductorStatus() {
    try {
        console.log(`(Servicio Externo) -> Ejecutando transbank.py...`);
        const result = await pythonService.executeScript('transbank.py');
        
        console.log(`(Servicio Externo) -> transbank.py stdout: "${result.stdout}"`);
        if (result.stderr) {
            console.log(`(Servicio Externo) -> transbank.py stderr: "${result.stderr}"`);
        }
        
        // Sanitizar para WhatsApp
        let statusData = cleanPythonOutput(result.stdout);
        
        if (!statusData) {
            return "No se pudo procesar la información de Transbank.";
        }
        
        return statusData;
    } catch (error) {
        console.error("Error en getTraductorStatus:", error.message);
        return "No pude obtener el estado de Transbank en este momento.";
    }
}

async function getBolsaData() {
    try {
        console.log(`(Servicio Externo) -> Ejecutando bolsa.py...`);
        const result = await pythonService.executeScript('bolsa.py');
        
        // Sanitizar para WhatsApp
        let bolsaData = cleanPythonOutput(result.stdout);
        
        if (!bolsaData) {
            console.error(`bolsa.py stderr: ${result.stderr}`);
            return "No se pudieron obtener los datos de la bolsa.";
        }
        
        return bolsaData;
    } catch (error) {
        console.error("Error en getBolsaData:", error.message);
        return "No pude obtener los datos de la bolsa en este momento.";
    }
}

module.exports = {
    getBencinaData,
    getTraductorStatus,
    getBolsaData,
};