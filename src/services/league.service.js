// src/services/league.service.js
"use strict";

const pythonService = require('./python.service');

// --- Funciones para cada comando de fútbol ---

async function getLeagueTable() {
    console.log(`(Servicio) -> Ejecutando tabla.py...`);
    return await pythonService.executeScript('tabla.py');
}

async function getLeagueUpcomingMatches() {
    console.log(`(Servicio) -> Ejecutando proxpar.py...`);
    return await pythonService.executeScript('proxpar.py');
}

async function getMatchDaySummary() {
    console.log(`(Servicio) -> Ejecutando partidos.py...`);
    return await pythonService.executeScript('partidos.py');
}

module.exports = {
    getLeagueTable,
    getLeagueUpcomingMatches,
    getMatchDaySummary
};