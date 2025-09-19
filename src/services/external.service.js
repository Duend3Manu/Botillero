// src/services/external.service.js
"use strict";

const fs = require('fs');
const path = require('path');
// Corregido: importar el servicio de python correctamente.
const pythonService = require('./python.service');

/**
 * Obtiene datos de bencineras ejecutando el script de python.
 * @param {string} comuna - La comuna para buscar.
 * @returns {Promise<string>} La salida del script.
 */
async function getBencinaData(comuna) {
    const scriptName = 'bencina.py';
    try {
        console.log(`(Servicio Externo) -> Ejecutando ${scriptName} para ${comuna || 'todas las comunas'}...`);
        // Corregido: usar el nombre de función correcto del servicio de python.
        const result = await pythonService.executePythonScript(scriptName, [comuna || '']);
        return result;
    } catch (err) {
        console.error(`[external.service] Error en getBencinaData:`, err.message || err);
        return "No se pudieron obtener los datos de las bencineras en este momento.";
    }
}

/**
 * Obtiene datos de la bolsa de Santiago ejecutando el script de python.
 * @returns {Promise<string>} La salida del script.
 */
async function getBolsaData() {
    const scriptName = 'bolsa.py';
    try {
        console.log(`(Servicio Externo) -> Ejecutando ${scriptName}...`);
        // Corregido: usar el nombre de función correcto del servicio de python.
        const result = await pythonService.executePythonScript(scriptName);
        return result;
    } catch (err) {
        console.error(`[external.service] Error en getBolsaData:`, err.message || err);
        return "No se pudieron obtener los datos de la bolsa en este momento.";
    }
}


module.exports = {
    getBencinaData,
    getBolsaData
};