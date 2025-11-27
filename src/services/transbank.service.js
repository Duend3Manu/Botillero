// src/services/transbank.service.js
"use strict";

const pythonService = require('./python.service');

const TRANSBANK_SCRIPT = 'transbank.py';

async function getTransbankStatus() {
    try {
        // Ejecutar script Python usando el servicio unificado
        const result = await pythonService.executeScript(TRANSBANK_SCRIPT);
        
        // El script ahora devuelve texto formateado por defecto
        // Si hay error técnico en la ejecución (exit code != 0)
        if (result.code !== 0) {
            console.error('Error ejecutando transbank.py:', result.stderr);
            return '⚠️ Hubo un error técnico al consultar Transbank.';
        }

        // Devolver directamente la salida formateada del script
        return result.stdout;

    } catch (error) {
        console.error('Error en servicio Transbank:', error);
        return '⚠️ Ocurrió un error al consultar el estado de Transbank.';
    }
}

module.exports = { getTransbankStatus };