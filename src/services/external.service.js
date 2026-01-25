// src/services/external.service.js
"use strict";

const pythonService = require('./python.service');
const { cleanPythonOutput } = require('../utils/sanitizer.util');

// La funcionalidad de consulta de bencina fue eliminada.
// Si necesitas restaurarla, implementar `getBencinaData` llamando al script correspondiente.

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

module.exports = {
    getTraductorStatus,
};