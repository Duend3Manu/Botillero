// src/services/network.service.js
"use strict";

const pythonService = require('./python.service');

async function analyzeDomain(domain) {
    try {
        const result = await pythonService.executeScript('net_analyzer.py', [domain]);
        
        if (result.code !== 0) {
            throw new Error(result.stderr || 'Error en el análisis de red.');
        }
        return result.stdout;
    } catch (error) {
        console.error("Error en analyzeDomain:", error.message);
        throw error;
    }
}

module.exports = {
    analyzeDomain
};