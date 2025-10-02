// src/services/league.service.js (VERSIÓN FINAL Y CORRECTA)
"use strict";

const pythonService = require('./python.service'); // Importamos el servicio centralizado

// --- Funciones para cada comando de fútbol ---

async function getLeagueTable() {
    console.log(`(Servicio) -> Ejecutando tabla.py...`);
    const { stdout } = await pythonService.executePythonScript('tabla.py');
    return stdout;
}

async function getLeagueUpcomingMatches() {
    console.log(`(Servicio) -> Ejecutando proxpar.py...`);
    const { stdout } = await pythonService.executePythonScript('proxpar.py');
    return stdout;
}

// --- NUEVA FUNCIÓN PARA !partidos ---
async function getMatchDaySummary() {
    console.log(`(Servicio) -> Ejecutando partidos.py...`);
    const { stdout } = await pythonService.executePythonScript('partidos.py');
    return stdout;
}

module.exports = {
    getLeagueTable,
    getLeagueUpcomingMatches,
    getMatchDaySummary // Exportamos la nueva función junto a las antiguas
};