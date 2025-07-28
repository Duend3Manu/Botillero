// src/services/league.service.js
"use strict";

const axios = require('axios');

// Configuramos la petición a la API
const api = axios.create({
    baseURL: 'https://v3.football.api-sports.io/',
    headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': process.env.API_FOOTBALL_KEY 
    }
});

const LEAGUE_ID = 265; // ID de la Primera División de Chile
const SEASON = new Date().getFullYear(); // Temporada actual

/**
 * Obtiene los próximos 5 partidos de la liga.
 * ¡Soluciona el problema de las fechas manuales!
 */
async function getLeagueUpcomingMatches() {
    try {
        // --- AÑADE ESTA LÍNEA AQUÍ ---
        console.log("CLAVE DE API QUE ESTOY USANDO:", process.env.API_FOOTBALL_KEY);
        // -----------------------------

        const { data } = await api.get('fixtures', {
            params: {
                league: LEAGUE_ID,
                season: SEASON,
                next: 5 
            }
        });

        if (data.response.length === 0) {
            return 'No hay próximos partidos programados en la liga chilena en este momento.';
        }

        let reply = '🇨🇱 *Próximos Partidos del Campeonato Nacional:*\n\n';
        data.response.forEach(fixture => {
            const matchDate = new Date(fixture.fixture.date).toLocaleString('es-CL', { timeZone: 'America/Santiago' });
            reply += `⚽ *${fixture.teams.home.name} vs ${fixture.teams.away.name}*\n`;
            reply += `🗓️ _${matchDate}_\n`;
            reply += `🏟️ _${fixture.fixture.venue.name}_\n\n`;
        });

        return reply;

    } catch (error) {
        console.error("Error al obtener próximos partidos:", error.response?.data);
        return 'Hubo un error al consultar los próximos partidos.';
    }
}

/**
 * Obtiene los partidos que se están jugando AHORA.
 * ¡Soluciona el problema del desfase de 2 minutos!
 */
async function getLeagueLiveMatches() {
    try {
        const { data } = await api.get('fixtures', {
            params: {
                league: LEAGUE_ID,
                season: SEASON,
                live: 'all' // Magia: ¡Solo partidos en vivo!
            }
        });

        if (data.response.length === 0) {
            return 'No hay partidos de la liga chilena en vivo en este momento.';
        }

        let reply = '🔴 *Partidos EN VIVO del Campeonato Nacional:*\n\n';
        data.response.forEach(fixture => {
            reply += `*${fixture.teams.home.name} ${fixture.goals.home} - ${fixture.goals.away} ${fixture.teams.away.name}*\n`;
            reply += `⏱️ _Minuto ${fixture.fixture.status.elapsed}'_\n\n`;
        });
        
        return reply;

    } catch (error) {
        console.error("Error al obtener partidos en vivo:", error.response?.data);
        return 'Hubo un error al consultar los partidos en vivo.';
    }
}

async function getLeagueTable() {
    // Esta función también se puede mejorar para usar la API y obtener la tabla de posiciones
    // Endpoint: 'standings', params: { league: LEAGUE_ID, season: SEASON }
    // Por ahora la dejamos como estaba para no cambiar todo de una vez.
    // Recomiendo actualizarla también.
    return "La función de tabla de posiciones necesita ser actualizada a la nueva API.";
}


module.exports = {
    getLeagueUpcomingMatches,
    getLeagueLiveMatches, // Exportamos la nueva función
    getLeagueTable
};