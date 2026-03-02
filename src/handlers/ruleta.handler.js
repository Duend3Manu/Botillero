// src/handlers/ruleta.handler.js
"use strict";

const { agregarPuntos, obtenerPuntos, obtenerRanking } = require('../services/puntos.service');
const moment = require('moment-timezone');

// --- Sistema de Control de Ruleta (Cooldown y Anti-Spam) ---
const ruletaCooldowns = new Map();    // userId -> timestamp del último uso
const ruletaSpamTracker = new Map();  // userId -> array de timestamps
const ruletaBannedUsers = new Map();  // userId -> timestamp de fin del ban

const RULETA_COOLDOWN_MS = 5000;     // 5 segundos entre usos
const SPAM_WINDOW_MS = 30000;        // Ventana de 30s para detectar spam
const SPAM_THRESHOLD = 6;            // 6+ usos en 30s = spam
const BAN_DURATION_MS = 20 * 60 * 1000; // 20 minutos de ban

// --- Utilidad: obtener nombre del usuario ---
async function getUserName(message, userId) {
    const userNumber = userId ? userId.split('@')[0] : 'Usuario';
    try {
        const contact = await message.getContact();
        return contact.pushname || contact.name || userNumber;
    } catch (e) {
        return userNumber;
    }
}

// --- Lógica de la Ruleta con Sistema de Puntos y Anti-Spam ---
async function handleRuleta(client, message) {
    try {
        const userId = message.author || message.from;
        const userName = await getUserName(message, userId);
        const ahora = Date.now();

        // 1. Verificar si el usuario está baneado
        if (ruletaBannedUsers.has(userId)) {
            const banEndTime = ruletaBannedUsers.get(userId);
            if (ahora < banEndTime) {
                const tiempoRestante = Math.ceil((banEndTime - ahora) / 60000);
                return message.reply(`⛔ *${userName}*, estás temporalmente bloqueado por hacer spam.\n\n⏳ Tiempo restante: *${tiempoRestante} minutos*`);
            } else {
                // Ban expirado, limpiar
                ruletaBannedUsers.delete(userId);
                ruletaSpamTracker.delete(userId);
            }
        }

        // 2. Verificar cooldown de 5 segundos
        if (ruletaCooldowns.has(userId)) {
            const lastUse = ruletaCooldowns.get(userId);
            const timeSinceLastUse = ahora - lastUse;

            if (timeSinceLastUse < RULETA_COOLDOWN_MS) {
                const esperaRestante = Math.ceil((RULETA_COOLDOWN_MS - timeSinceLastUse) / 1000);
                return message.reply(`⏱️ Espera *${esperaRestante}s* antes de volver a jugar.`);
            }
        }

        // 3. Detectar spam (tracking de uso frecuente)
        if (!ruletaSpamTracker.has(userId)) {
            ruletaSpamTracker.set(userId, []);
        }

        const spamHistory = ruletaSpamTracker.get(userId);
        const recentUses = spamHistory.filter(t => ahora - t < SPAM_WINDOW_MS);
        recentUses.push(ahora);
        ruletaSpamTracker.set(userId, recentUses);

        // Si supera el threshold, banear
        if (recentUses.length >= SPAM_THRESHOLD) {
            const banUntil = ahora + BAN_DURATION_MS;
            ruletaBannedUsers.set(userId, banUntil);
            ruletaCooldowns.delete(userId);
            ruletaSpamTracker.delete(userId);

            return message.reply(`🚫 *${userName}*, detecté que estás haciendo spam del comando.\n\n⛔ *Bloqueado por 20 minutos.*\n\n💡 Usa el comando con moderación.`);
        }

        // 4. Actualizar cooldown
        ruletaCooldowns.set(userId, ahora);

        // 5. Premios con sus probabilidades
        const premios = [
            { nombre: '¡Nada! Suerte para la próxima 💨', puntos: 0,   chance: 30 },
            { nombre: '10 puntitos 🎯',                   puntos: 10,  chance: 40 },
            { nombre: '50 puntos ⭐',                      puntos: 50,  chance: 15 },
            { nombre: '¡100 puntos! Nada mal 🎊',          puntos: 100, chance: 10 },
            { nombre: '¡¡500 PUNTOS!! ¡El Jackpot! 💎',   puntos: 500, chance: 5  }
        ];

        // 6. Animación de suspense
        await message.reply('🎰 *Ruleta de la Suerte* 🎰\n\nGirando la ruleta...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        await message.reply('🔄 Girando... girando...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 7. Calcular premio (ruleta ponderada)
        const random = Math.random() * 100;
        let acumulado = 0;
        let premioGanado = premios[0];

        for (const premio of premios) {
            acumulado += premio.chance;
            if (random < acumulado) {
                premioGanado = premio;
                break;
            }
        }

        // 8. Guardar puntos
        const nuevoTotal = agregarPuntos(userId, userName, premioGanado.puntos);

        // 9. Emoji según premio
        let emoji = '🎉';
        if (premioGanado.puntos === 0)        emoji = '😢';
        else if (premioGanado.puntos >= 500)  emoji = '🎊💰';
        else if (premioGanado.puntos >= 100)  emoji = '🎉';
        else if (premioGanado.puntos >= 50)   emoji = '✨';

        // 10. Mensaje final
        let mensajeResultado = `${emoji} *${userName}*, la ruleta se detuvo y ganaste:\n\n💥 *${premioGanado.nombre}*`;

        if (premioGanado.puntos > 0) {
            mensajeResultado += `\n\n🏆 Total de puntos: *${nuevoTotal}*`;
        } else {
            mensajeResultado += `\n\n💡 Sigue intentando para ganar puntos.`;
        }

        await message.reply(mensajeResultado);

    } catch (error) {
        console.error('Error en handleRuleta:', error);
        return message.reply('❌ La ruleta se atascó. Intenta de nuevo.');
    }
}

// --- Ver puntos propios ---
async function handlePuntos(client, message) {
    try {
        const userId = message.author || message.from;
        const userName = await getUserName(message, userId);
        const datosUsuario = obtenerPuntos(userId);

        if (datosUsuario.puntos === 0) {
            return message.reply(`*${userName}*, aún no tienes puntos. ¡Usa \`!ruleta\` para empezar a ganar! 🎰`);
        }

        await message.reply(`🏆 *${userName}*, actualmente tienes:\n\n🏆 *${datosUsuario.puntos}* puntos\n\n💡 Usa \`!ruleta\` para ganar más.`);

    } catch (error) {
        console.error('Error en handlePuntos:', error);
        return message.reply('❌ Error al obtener tus puntos.');
    }
}

// --- Ver ranking global (Top 10) ---
async function handleRanking(client, message) {
    try {
        const ranking = obtenerRanking(10);

        if (ranking.length === 0) {
            return message.reply('🏆 Aún no hay jugadores en el ranking.\n\n💡 Usa `!ruleta` para ser el primero.');
        }

        const medallas = ['🥇', '🥈', '🥉'];
        let mensajeRanking = '🏆 *TOP 10 JUGADORES* 🏆\n\n';

        ranking.forEach((jugador, index) => {
            const emoji = medallas[index] || `${index + 1}.`;
            mensajeRanking += `${emoji} *${jugador.nombre}*: ${jugador.puntos} pts\n`;
        });

        await message.reply(mensajeRanking);

    } catch (error) {
        console.error('Error en handleRanking:', error);
        return message.reply('❌ Error al obtener el ranking.');
    }
}

module.exports = { handleRuleta, handlePuntos, handleRanking };
