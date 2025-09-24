// src/services/utility.service.js
"use strict";

const pythonService = require('./python.service');

async function getFeriados() {
    return await pythonService.executeScript('feriados.py');
}

async function getRandomInfo() {
    console.log("(Servicio Utilidad) -> Ejecutando random_info.py...");
    const result = await pythonService.executeScript('random_info.py');
    
    // El python.service ya intenta parsear JSON. 
    // Si es un objeto, lo devolverá como tal. Si no, como texto.
    return result;
}

module.exports = {
    getFeriados,
    getRandomInfo
};