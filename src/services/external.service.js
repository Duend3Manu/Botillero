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
        let bencinaData = await pythonService.executeScript('bencina.py', [comuna]);
        
        // Sanitizar para WhatsApp
        bencinaData = cleanPythonOutput(bencinaData);
        
        if (!bencinaData) {
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
        let statusData = await pythonService.executeScript('transbank.py');
        
        // Sanitizar para WhatsApp
        statusData = cleanPythonOutput(statusData);
        
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
        let bolsaData = await pythonService.executeScript('bolsa.py');
        
        // Sanitizar para WhatsApp
        bolsaData = cleanPythonOutput(bolsaData);
        
        if (!bolsaData) {
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