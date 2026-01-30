// src/services/texto.service.js
"use strict";

const pythonService = require('./python.service');

async function addTextToImage(imagePath, topText, bottomText) {
    try {
        const result = await pythonService.executeScript('texto.py', [imagePath, topText, bottomText]);

        if (result.code !== 0) {
            throw new Error(result.stderr || 'Error al ejecutar texto.py');
        }
        return result.stdout.trim();
    } catch (error) {
        console.error("Error en addTextToImage:", error.message);
        throw error;
    }
}

module.exports = {
    addTextToImage
};