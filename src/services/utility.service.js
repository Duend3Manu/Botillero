// src/services/utility.service.js (Versión con más depuración)
"use strict";

const pythonService = require('./python.service');

async function getRandomInfo() {
    try {
        const result = await pythonService.executeScript('random_info.py');

        if (result.code !== 0) {
            console.error("[ERROR utility.service] random_info.py falló:", result.stderr);
            throw new Error(result.stderr || 'Error en script Python');
        }

        // pythonService intenta parsear JSON automáticamente en result.json
        return result.json || JSON.parse(result.stdout);

    } catch (e) {
        console.error("[ERROR utility.service] Error procesando random_info:", e);
        // Fallback de emergencia
        return { type: 'text', caption: '⚠️ Error interno al procesar el dato aleatorio.' };
    }
}

module.exports = {
    getRandomInfo
};