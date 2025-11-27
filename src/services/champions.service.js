// src/services/champions.service.js
"use strict";

const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment-timezone');

// API de football-data.org (Champions League ID: 524)
const FOOTBALL_API_URL = 'https://api.football-data.org/v4';
const CHAMPIONS_LEAGUE_ID = 524;
const API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';

/**
 * Obtiene los partidos de la Champions League para una fecha específica
 * @returns {Promise<string>} Mensaje formateado con los partidos
 */
async function getChampionsMatches() {
    try {
        console.log('(Champions Service) -> Obteniendo partidos reales de Champions...');
        
        // Intentar con API primero
        if (API_KEY) {
            const apiMatches = await getMatchesFromAPI();
            if (apiMatches && apiMatches.length > 0) {
                return formatChampionsMatches(apiMatches);
            }
        }
        
        // Si no hay API, intentar scraping directo
        console.log('(Champions Service) -> Intentando scraping directo...');
        return await getChampionsMatchesAlternative();
    } catch (error) {
        console.error('(Champions Service) -> Error:', error.message);
        return '❌ No pude obtener los partidos de la Champions League. Intenta más tarde.';
    }
}

/**
 * Obtiene partidos desde API de football-data.org
 */
async function getMatchesFromAPI() {
    try {
        const headers = {
            'X-Auth-Token': API_KEY
        };

        // Obtener próximos partidos
        const response = await axios.get(
            `${FOOTBALL_API_URL}/competitions/${CHAMPIONS_LEAGUE_ID}/matches?status=SCHEDULED`,
            { headers, timeout: 10000 }
        );

        if (response.data && response.data.matches && response.data.matches.length > 0) {
            return response.data.matches.slice(0, 10).map(match => ({
                time: moment(match.utcDate).tz('America/Santiago').format('HH:mm'),
                home: match.homeTeam.name,
                away: match.awayTeam.name,
                date: moment(match.utcDate).tz('America/Santiago').format('DD/MM/YYYY'),
                status: match.status
            }));
        }
        return null;
    } catch (error) {
        console.error('(Champions Service) -> Error en API:', error.message);
        return null;
    }
}

/**
 * Método alternativo: Scraping directo de UEFA.com - Script optimizado
 * Extrae partidos completados y pendientes desde fixtures-results
 */
async function getChampionsMatchesAlternative() {
    const puppeteer = require('puppeteer');
    let browser;

    try {
        console.log('(Champions Service) -> Scraping de UEFA.com en tiempo real...');
        
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox'],
        });

        const page = await browser.newPage();
        await page.goto('https://es.uefa.com/uefachampionsleague/fixtures-results/', {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

        const matchesData = await page.evaluate(() => {
            const matchElements = [];
            const dateElements = document.querySelectorAll('h2, h3');
            let currentDateSection = dateElements[0];
            const dateHeader = currentDateSection?.textContent.trim() || 'Fecha no encontrada';

            const matches = document.querySelectorAll('[href*="/uefachampionsleague/match/"]');
            matches.forEach((match) => {
                const matchRow = match.closest('div, section');
                if (matchRow) {
                    const fullText = matchRow.textContent || match.textContent;
                    const scoreMatch = fullText.match(/(\d+)\s+(\d+)/);

                    if (scoreMatch) {
                        const teams = fullText
                            .split(scoreMatch[0])[0]
                            .trim()
                            .split('\n')
                            .filter((t) => t.trim() && t.length > 1);

                        matchElements.push({
                            estado: 'COMPLETADO',
                            home: teams[0]?.trim() || 'N/A',
                            homeGoals: scoreMatch[1],
                            away: teams[1]?.trim() || 'N/A',
                            awayGoals: scoreMatch[2],
                        });
                    } else if (fullText.includes('Ver detalles')) {
                        const teams = fullText
                            .replace('Ver detalles', '')
                            .trim()
                            .split('\n')
                            .slice(0, 2)
                            .filter((t) => t.trim() && t.length > 1);

                        matchElements.push({
                            estado: 'PENDIENTE',
                            home: teams[0]?.trim() || 'N/A',
                            homeGoals: null,
                            away: teams[1]?.trim() || 'N/A',
                            awayGoals: null,
                        });
                    }
                }
            });

            return {
                fecha: dateHeader,
                hay_partidos: matchElements.length > 0,
                partidos: matchElements,
            };
        });

        await browser.close();
        browser = null;

        console.log(`(Champions Service) -> Encontrados ${matchesData.partidos.length} partidos reales`);
        
        if (!matchesData.hay_partidos || matchesData.partidos.length === 0) {
            console.warn('(Champions Service) -> No se encontraron partidos');
            return '⚠️ No hay partidos programados en este momento.\n\nIntenta más tarde o verifica la tabla de posiciones con: !tchampion';
        }

        // Convertir formato a formatChampionsMatches
        const formattedMatches = matchesData.partidos.slice(0, 10).map(m => ({
            time: '--:--',
            home: m.home,
            away: m.away,
            homeGoals: m.homeGoals,
            awayGoals: m.awayGoals,
            status: m.estado,
            date: matchesData.fecha
        }));

        return formatChampionsMatches(formattedMatches);
    } catch (error) {
        console.error('(Champions Service) -> Error en scraping:', error.message);
        if (browser) await browser.close().catch(() => {});
        
        return '❌ No pude conectar con UEFA.com en este momento.\n\nIntenta más tarde.';
    }
}

/**
 * Obtiene la tabla de posiciones de la Champions League
 * @returns {Promise<string>} Mensaje formateado con la tabla
 */
async function getChampionsStandings() {
    try {
        console.log('(Champions Service) -> Obteniendo tabla de posiciones real...');
        
        // Intentar con API primero
        if (API_KEY) {
            const apiStandings = await getStandingsFromAPI();
            if (apiStandings && apiStandings.length > 0) {
                return formatChampionsStandings(apiStandings);
            }
        }
        
        // Si no hay API, intentar scraping
        console.log('(Champions Service) -> Intentando scraping de tabla...');
        return await getChampionsStandingsAlternative();
    } catch (error) {
        console.error('(Champions Service) -> Error:', error.message);
        return '❌ No pude obtener la tabla de posiciones. Intenta más tarde.';
    }
}

/**
 * Obtiene tabla desde API de football-data.org
 */
async function getStandingsFromAPI() {
    try {
        const headers = {
            'X-Auth-Token': API_KEY
        };

        const response = await axios.get(
            `${FOOTBALL_API_URL}/competitions/${CHAMPIONS_LEAGUE_ID}/standings`,
            { headers, timeout: 10000 }
        );

        if (response.data && response.data.standings && response.data.standings[0]) {
            const table = response.data.standings[0].table;
            return table.map((team, index) => ({
                pos: index + 1,
                team: team.team.name,
                points: team.points,
                played: team.playedGames,
                won: team.won,
                drawn: team.draw,
                lost: team.lost
            }));
        }
        return null;
    } catch (error) {
        console.error('(Champions Service) -> Error en API tabla:', error.message);
        return null;
    }
}

/**
 * Método alternativo: Scraping de tabla desde Wikipedia (más estable)
 */
async function getChampionsStandingsAlternative() {
    let browser = null;
    try {
        console.log('(Champions Service) -> Scraping tabla de fuente confiable...');
        
        // Intentar primero UEFA.com
        const uefaResult = await scrapeUEFAStandings();
        if (uefaResult && uefaResult.length > 0) {
            console.log(`(Champions Service) -> Encontrados ${uefaResult.length} equipos reales de UEFA`);
            return formatChampionsStandings(uefaResult);
        }
        
        // Si UEFA no funciona, intentar scraping HTML directo con Cheerio
        console.log('(Champions Service) -> Intentando scraping HTML directo...');
        return '⚠️ No se pudo cargar la tabla de posiciones en este momento.\n\n💡 Para datos reales, configura FOOTBALL_DATA_API_KEY en tu .env\n\nVer: REAL_DATA_SETUP.md';
        
    } catch (error) {
        console.error('(Champions Service) -> Error scraping tabla:', error.message);
        if (browser) await browser.close().catch(() => {});
        
        return '❌ No pude conectar con UEFA.com en este momento.\n\nIntenta más tarde.';
    }
}

/**
 * Scraping de tabla desde UEFA.com usando Puppeteer - Script optimizado
 * Extrae todos los 36 equipos con posición y puntos
 */
async function scrapeUEFAStandings() {
    const puppeteer = require('puppeteer');
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox'],
        });

        const page = await browser.newPage();
        await page.goto('https://es.uefa.com/uefachampionsleague/standings/', {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

        const standings = await page.evaluate(() => {
            const result = [];
            const rows = document.querySelectorAll('tr[role="row"], [role="row"]');

            rows.forEach((row) => {
                const cells = row.querySelectorAll('td, [role="gridcell"]');

                if (cells.length > 0) {
                    const posicionElement = cells[0];
                    const equipoElement = cells[1];
                    const puntosElement = cells.length > 8 ? cells[8] : null;

                    if (posicionElement && equipoElement && puntosElement) {
                        const posicionText = posicionElement.textContent.trim();
                        const equipoText = equipoElement.textContent.trim();
                        const puntosText = puntosElement.textContent.trim();

                        const posicion = posicionText.replace(/\D/g, '').split('')[0] || 0;

                        if (equipoText && puntosText && !isNaN(puntosText)) {
                            result.push({
                                pos: parseInt(posicion),
                                team: equipoText,
                                points: parseInt(puntosText),
                            });
                        }
                    }
                }
            });

            // Remover duplicados y retornar todos los equipos (sin limitar)
            const unique = [];
            const seen = new Set();

            result.forEach((item) => {
                if (!seen.has(item.team)) {
                    seen.add(item.team);
                    unique.push(item);
                }
            });

            return unique; // Retorna todos los 36 equipos
        });

        await browser.close();
        browser = null;

        return standings;
    } catch (error) {
        console.error('(Champions Service) -> Error en UEFA scraping:', error.message);
        if (browser) await browser.close().catch(() => {});
        return [];
    }
}

/**
 * Retorna la bandera del país según el equipo - Mapeo completo
 */
function getTeamFlag(teamName) {
    const flags = {
        // Inglaterra
        'Arsenal': '🇬🇧',
        'Tottenham': '🇬🇧',
        'Chelsea': '🇬🇧',
        'Liverpool': '🇬🇧',
        'Manchester City': '🇬🇧',
        'Man City': '🇬🇧',
        'Newcastle': '🇬🇧',
        
        // Francia
        'Paris': '🇫🇷',
        'PSG': '🇫🇷',
        'Marseille': '🇫🇷',
        'Lyon': '🇫🇷',
        'Monaco': '🇫🇷',
        
        // España
        'Real Madrid': '🇪🇸',
        'Barcelona': '🇪🇸',
        'Atlético Madrid': '🇪🇸',
        'Atleti': '🇪🇸',
        'Sevilla': '🇪🇸',
        'Athletic Club': '🇪🇸',
        'Villarreal': '🇪🇸',
        
        // Alemania
        'Bayern Munich': '🇩🇪',
        'Bayern München': '🇩🇪',
        'Dortmund': '🇩🇪',
        'B. Dortmund': '🇩🇪',
        'RB Leipzig': '🇩🇪',
        'Leverkusen': '🇩🇪',
        'Bayer Leverkusen': '🇩🇪',
        'Frankfurt': '🇩🇪',
        
        // Italia
        'Inter': '🇮🇹',
        'Inter Milan': '🇮🇹',
        'Juventus': '🇮🇹',
        'Napoli': '🇮🇹',
        'AC Milan': '🇮🇹',
        'Atalanta': '🇮🇹',
        
        // Portugal
        'Benfica': '🇵🇹',
        'Porto': '🇵🇹',
        'Sporting CP': '🇵🇹',
        'Sporting': '🇵🇹',
        
        // Países Bajos
        'Ajax': '🇳🇱',
        'PSV': '🇳🇱',
        'Feyenoord': '🇳🇱',
        
        // Turquía
        'Galatasaray': '🇹🇷',
        'Fenerbahçe': '🇹🇷',
        
        // Bélgica
        'Club Brugge': '🇧🇪',
        'Union SG': '🇧🇪',
        
        // Escocia
        'Rangers': '🇬🇧',
        'Celtic': '🇬🇧',
        
        // República Checa
        'Slavia Praha': '🇨🇿',
        
        // Noruega
        'Bodø/Glimt': '🇳🇴',
        
        // Grecia
        'Olympiacos': '🇬🇷',
        
        // Dinamarca
        'Copenhagen': '🇩🇰',
        
        // Chipre
        'Pafos': '🇨🇾',
        
        // Azerbaiyán
        'Qarabağ': '🇦🇿',
        
        // Kazajistán
        'Kairat Almaty': '🇰🇿'
    };
    return flags[teamName] || '⚽';
}

/**
 * Formatea los partidos para mostrar
 */
function formatChampionsMatches(matches, isExample = false) {
    if (!matches || matches.length === 0) {
        return '⚠️ No hay partidos disponibles en esta fecha.';
    }

    let message = '⚽ *🏆 CHAMPIONS LEAGUE 🏆* ⚽\n';
    message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    
    const chilTime = moment.tz('America/Santiago').format('DD/MM/YYYY HH:mm');
    message += `📅 *Hora en Chile:* ${chilTime}\n`;
    if (matches[0].date) {
        message += `📆 *Fecha de partidos:* ${matches[0].date}\n`;
    }
    message += '\n';
    
    if (isExample) {
        message += '⚠️ _(Datos de referencia - sin partidos en vivo)_\n\n';
    }

    matches.forEach((match, index) => {
        const flagHome = getTeamFlag(match.home);
        const flagAway = getTeamFlag(match.away);
        
        // Mostrar goles si el partido está completado
        let result = '';
        if (match.homeGoals !== null && match.awayGoals !== null) {
            result = `${match.homeGoals} - ${match.awayGoals}`;
        }
        
        message += `\n${index + 1}️⃣ *${match.time || '--:--'}*`;
        if (result) {
            message += ` [${result}]`;
        }
        message += '\n';
        message += `${flagHome} *${match.home.toUpperCase()}*\n`;
        message += `     VS\n`;
        message += `${flagAway} *${match.away.toUpperCase()}*\n`;
        message += '─ ─ ─ ─ ─ ─ ─ ─ ─\n';
    });

    message += `\n⚡ *Total:* ${matches.length} partido${matches.length !== 1 ? 's' : ''}`;
    message += '\n\n🔔 ¡Que disfrutes los partidos! ⚽';
    
    return message;
}

/**
 * Obtiene el estado de clasificación según la posición
 */
function getClassificationStatus(position) {
    if (position <= 8) {
        return '✅';
    } else if (position <= 16) {
        return '🎯';
    } else if (position <= 24) {
        return '⏳';
    } else {
        return '❌';
    }
}

/**
 * Formatea la tabla de posiciones sin barras, con todos los equipos
 */
function formatChampionsStandings(standings, isExample = false) {
    if (!standings || standings.length === 0) {
        return '⚠️ No se pudo cargar la tabla de posiciones.';
    }

    let message = '🏆 *TABLA DE POSICIONES* 🏆\n';
    message += '✨ *CHAMPIONS LEAGUE* ✨\n';
    message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    
    if (isExample) {
        message += '⚠️ _(Datos de referencia)_\n\n';
    }

    // Ordenar por puntos descendente (UEFA ordena por puntos)
    const sortedStandings = standings.sort((a, b) => b.points - a.points);

    // Reasignar posiciones correctas basadas en orden
    sortedStandings.forEach((team, index) => {
        team.pos = index + 1;
    });

    // Mostrar todos los equipos
    let lastSection = 0;
    sortedStandings.forEach((team) => {
        const pos = team.pos;
        const flag = getTeamFlag(team.team);
        const status = getClassificationStatus(pos);
        
        // Agregar separadores de clasificación
        if (pos === 1 && lastSection !== 1) {
            message += '✅ *DIRECTO A OCTAVOS*\n';
            lastSection = 1;
        } else if (pos === 9 && lastSection !== 9) {
            message += '\n🎯 *PLAYOFF (CABEZAS DE SERIE)*\n';
            lastSection = 9;
        } else if (pos === 17 && lastSection !== 17) {
            message += '\n⏳ *PLAYOFF (NO CABEZAS DE SERIE)*\n';
            lastSection = 17;
        } else if (pos === 25 && lastSection !== 25) {
            message += '\n❌ *ELIMINADOS*\n';
            lastSection = 25;
        }
        
        // Formatear línea de equipo
        const posStr = pos.toString().padStart(2, ' ');
        const ptsStr = team.points.toString().padStart(2, ' ');
        message += `${posStr}. ${status} ${flag} ${team.team.substring(0, 25)} • ${ptsStr} pts\n`;
    });

    message += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    message += '📊 *Tabla completa (36 equipos)*\n';
    message += '✅ 1-8: Directo a octavos\n';
    message += '🎯 9-16: Playoff (Cabezas de serie)\n';
    message += '⏳ 17-24: Playoff (No cabezas de serie)\n';
    message += '❌ 25-36: Eliminados\n';
    message += '💪 ¡Que compita el mejor! ⚽';
    
    return message;
}

module.exports = {
    getChampionsMatches,
    getChampionsStandings
};
