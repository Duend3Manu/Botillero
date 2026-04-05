// src/services/league.service.js (VERSIÓN FINAL Y CORRECTA)
"use strict";

const pythonService = require('./python.service');

// Variables para caché
let tableCache = null;
let lastTableUpdate = 0;

let upcomingCache = null;
let lastUpcomingUpdate = 0;

let summaryCache = null;
let lastSummaryUpdate = 0;

let cligaCache = null;
let lastCligaUpdate = 0;

let ligaCache = null;
let lastLigaUpdate = 0;

const LIVE_DATA_TTL = 60 * 1000; // 1 minuto (Tablas y partidos en vivo)
const STATIC_DATA_TTL = 60 * 60 * 1000; // 1 hora (Próximos partidos)

// --- Funciones para cada comando de fútbol ---

async function getLeagueTable() {
    if (tableCache && (Date.now() - lastTableUpdate < LIVE_DATA_TTL)) {
        return tableCache;
    }

    try {
        console.log(`(Servicio Liga) -> Ejecutando tabla.py...`);
        const result = await pythonService.executeScript('tabla.py');
        if (result.code !== 0) {
            throw new Error(result.stderr || 'Error al ejecutar tabla.py');
        }
        tableCache = result.stdout;
        lastTableUpdate = Date.now();
        return result.stdout;
    } catch (error) {
        console.error("Error en getLeagueTable:", error.message);
        if (tableCache) return `${tableCache}\n\n_(⚠️ Datos antiguos, error al actualizar)_`;
        return "No pude obtener la tabla de la liga.";
    }
}

async function getLeagueUpcomingMatches() {
    if (upcomingCache && (Date.now() - lastUpcomingUpdate < STATIC_DATA_TTL)) {
        return upcomingCache;
    }

    try {
        console.log(`(Servicio Liga) -> Ejecutando proxpar.py...`);
        // Aumentamos el timeout a 60s porque Selenium puede ser lento
        const result = await pythonService.executeScript('proxpar.py', [], { timeout: 60000 });
        if (result.code !== 0) {
            throw new Error(result.stderr || 'Error al ejecutar proxpar.py');
        }
        upcomingCache = result.stdout;
        lastUpcomingUpdate = Date.now();
        return result.stdout;
    } catch (error) {
        console.error("Error en getLeagueUpcomingMatches:", error.message);
        if (upcomingCache) return `${upcomingCache}\n\n_(⚠️ Datos antiguos, error al actualizar)_`;
        return "No pude obtener los próximos partidos.";
    }
}

// --- NUEVA FUNCIÓN PARA !partidos ---
async function getMatchDaySummary() {
    if (summaryCache && (Date.now() - lastSummaryUpdate < LIVE_DATA_TTL)) {
        return summaryCache;
    }

    try {
        console.log(`(Servicio Liga) -> Ejecutando partidos.py...`);
        const result = await pythonService.executeScript('partidos.py');
        if (result.code !== 0) {
            throw new Error(result.stderr || 'Error al ejecutar partidos.py');
        }
        summaryCache = result.stdout;
        lastSummaryUpdate = Date.now();
        return result.stdout;
    } catch (error) {
        console.error("Error en getMatchDaySummary:", error.message);
        if (summaryCache) return `${summaryCache}\n\n_(⚠️ Datos antiguos, error al actualizar)_`;
        return "No pude obtener el resumen de la fecha.";
    }
}

// --- NUEVAS FUNCIONES PARA COPA LIGA ---
async function getCopaLigaGroups() {
    if (cligaCache && (Date.now() - lastCligaUpdate < STATIC_DATA_TTL)) {
        return cligaCache;
    }
    try {
        console.log(`(Servicio Liga) -> Ejecutando cliga.py...`);
        const result = await pythonService.executeScript('cliga.py');
        if (result.code !== 0) throw new Error(result.stderr || 'Error al ejecutar cliga.py');
        cligaCache = result.stdout;
        lastCligaUpdate = Date.now();
        return result.stdout;
    } catch (error) {
        console.error("Error en getCopaLigaGroups:", error.message);
        if (cligaCache) return `${cligaCache}\n\n_(⚠️ Datos antiguos)_`;
        return "No pude obtener los grupos de la Copa de la Liga.";
    }
}

async function getCopaLigaMatches() {
    if (ligaCache && (Date.now() - lastLigaUpdate < LIVE_DATA_TTL)) {
        return ligaCache;
    }
    try {
        console.log(`(Servicio Liga) -> Ejecutando liga.py...`);
        const result = await pythonService.executeScript('liga.py');
        if (result.code !== 0) throw new Error(result.stderr || 'Error al ejecutar liga.py');
        
        // El script liga.py ahora devuelve un JSON
        const data = result.json;
        if (!data || data.error) {
            return `❌ Hubo un error en la cancha: ${data ? data.error : 'No se recibieron datos'}`;
        }

        // Armamos el mensaje para WhatsApp (Lógica sugerida por el usuario)
        let mensajeRespuesta = `🏆 *Copa de la Liga - ${data.titulo}* 🏆\n\n`;

        data.partidos.forEach(partido => {
            let icono = partido.resultado === 'Por jugar' ? '⏳' : '✅';
            // Si ya hay marcador, lo destacamos en negrita
            let marcador = partido.resultado === 'Por jugar' ? 'Por jugar' : `*${partido.resultado}*`;
            
            mensajeRespuesta += `📅 ${partido.fecha_hora}\n`;
            mensajeRespuesta += `${icono} ${partido.local} ${marcador} ${partido.visita}\n\n`;
        });

        ligaCache = mensajeRespuesta;
        lastLigaUpdate = Date.now();
        return mensajeRespuesta;
    } catch (error) {
        console.error("Error en getCopaLigaMatches:", error.message);
        if (ligaCache) return `${ligaCache}\n\n_(⚠️ Datos antiguos)_`;
        return "No pude obtener los partidos de la Copa de la Liga.";
    }
}

module.exports = {
    getLeagueTable,
    getLeagueUpcomingMatches,
    getMatchDaySummary,
    getCopaLigaGroups,
    getCopaLigaMatches
};