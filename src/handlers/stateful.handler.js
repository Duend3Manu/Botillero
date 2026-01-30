// src/handlers/stateful.handler.js
"use strict";

const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');

const TICKET_FILE_PATH = path.join(__dirname, '..', '..', 'ticket.json');
const CASOS_FILE_PATH = path.join(__dirname, '..', '..', 'casos.json');

// --- Clase Mutex para evitar condiciones de carrera (Race Conditions) ---
class Mutex {
    constructor() {
        this._queue = [];
        this._locked = false;
    }

    lock() {
        return new Promise((resolve) => {
            if (this._locked) this._queue.push(resolve);
            else { this._locked = true; resolve(); }
        });
    }

    release() {
        if (this._queue.length > 0) this._queue.shift()();
        else this._locked = false;
    }
}

// --- Funciones auxiliares para leer/escribir JSON ---
async function readJsonFile(filePath) {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Si el archivo no existe, lo creamos vacío y retornamos array vacío
        if (error.code === 'ENOENT') {
            await fs.promises.writeFile(filePath, '[]', 'utf8');
            return [];
        }
        // MEJORA 1: Si el JSON está corrupto (error de sintaxis), lo reiniciamos para no botar el sistema
        if (error instanceof SyntaxError) {
            console.error(`⚠️ Error de sintaxis en ${filePath}. El archivo parece corrupto. Se reiniciará.`);
            await fs.promises.writeFile(filePath, '[]', 'utf8');
            return [];
        }
        throw error;
    }
}

async function writeJsonFile(filePath, data) {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Instancias de bloqueo para cada archivo
const ticketMutex = new Mutex();
const casoMutex = new Mutex();

// --- Lógica para el sistema de Tickets ---
async function handleTicket(message) {
    // Extracción robusta del comando y argumentos usando Regex
    const match = message.body.match(/^([!/])(ticketr|tickete|ticket)(?:\s+(.*))?$/is);
    if (!match) return null;

    const subCommand = match[2].toLowerCase();
    const value = match[3] ? match[3].trim() : '';

    await ticketMutex.lock(); // 🔒 Bloqueamos el acceso al archivo
    try {
        const tickets = await readJsonFile(TICKET_FILE_PATH);

        switch (subCommand) {
            case 'ticket':
                if (!value) { // Listar tickets
                    if (tickets.length === 0) return 'No hay tickets guardados.';
                    let response = '🎟️ *Tickets guardados:*\n\n';
                    tickets.forEach((ticket, index) => {
                        const dateStr = ticket.createdAt ? ` [${new Date(ticket.createdAt).toLocaleDateString('es-CL')}]` : '';
                        response += `${index + 1}. ${ticket.text}${dateStr} ${ticket.resolved ? '✅' : '⏳'}\n`;
                    });
                    return response;
                } else { // Crear ticket
                    await message.react('⏳');
                    tickets.push({ 
                        text: value, 
                        resolved: false,
                        createdAt: new Date().toISOString()
                    });
                    await writeJsonFile(TICKET_FILE_PATH, tickets);
                    await message.react('✅');
                    return 'Ticket guardado exitosamente ⏳.';
                }

            case 'ticketr': // Resolver ticket
                if (!/^\d+$/.test(value)) return '⚠️ Por favor, ingresa un número de ticket válido.';
                const ticketRNum = parseInt(value) - 1;
                if (tickets[ticketRNum]) {
                    tickets[ticketRNum].resolved = true;
                    await writeJsonFile(TICKET_FILE_PATH, tickets);
                    await message.react('✅');
                    return `El ticket ${value} ha sido marcado como resuelto ✅.`;
                }
                return 'Número de ticket inválido.';

            case 'tickete': // Eliminar ticket
                if (!/^\d+$/.test(value)) return '⚠️ Por favor, ingresa un número de ticket válido.';
                const ticketENum = parseInt(value) - 1;
                if (tickets[ticketENum]) {
                    tickets.splice(ticketENum, 1);
                    await writeJsonFile(TICKET_FILE_PATH, tickets);
                    await message.react('🗑️');
                    return `El ticket ${value} ha sido eliminado.`;
                }
                return 'Número de ticket inválido.';
            
            default:
                return 'Comando de ticket no válido.';
        }
    } catch (e) {
        throw e;
    } finally {
        ticketMutex.release(); // 🔓 Liberamos el archivo siempre
    }
}


// --- Lógica para el sistema de Casos Aislados ---
async function handleCaso(message) {
    const match = message.body.match(/^([!/])(ecaso|icaso|caso)(?:\s+(.*))?$/is);
    if (!match) return null;

    const subCommand = match[2].toLowerCase();
    const value = match[3] ? match[3].trim() : '';

    await casoMutex.lock(); // 🔒 Bloqueamos el acceso al archivo
    try {
        const casos = await readJsonFile(CASOS_FILE_PATH);

        switch(subCommand) {
            case 'caso': // Crear caso
                await message.react('⏳');
                const nuevoCaso = {
                    descripcion: `Caso Aislado Número ${casos.length + 1}: ${value}`,
                    enlace: value,
                    fecha_ingreso: new Date().toISOString()
                };
                casos.push(nuevoCaso);
                await writeJsonFile(CASOS_FILE_PATH, casos);
                await message.react('👮‍♂️');
                return `Caso Aislado Número ${casos.length} registrado.`;

            case 'ecaso': // Eliminar último caso
                if (casos.length > 0) {
                    casos.pop();
                    await writeJsonFile(CASOS_FILE_PATH, casos);
                    return `Se eliminó el último caso. Ahora hay ${casos.length} casos.`;
                }
                return 'No hay casos para eliminar.';
            
            case 'icaso': // Listar casos
                if (casos.length === 0) return 'No hay casos registrados.';
                
                // MEJORA: Paginación (Mostrar solo los últimos 15)
                const limit = 15;
                const start = Math.max(0, casos.length - limit);
                const visibleCasos = casos.slice(start);
                
                const fechaHoy = new Date().toLocaleDateString('es-CL');
                let response = `👮🏽 *Hay ${casos.length} Casos Aislados hasta el día de hoy ${fechaHoy}*\n\n`;
                
                visibleCasos.forEach((caso) => {
                    response += `• ${caso.descripcion}\n`;
                });
                
                if (casos.length > limit) {
                    response += `\n_... y ${casos.length - limit} casos más anteriores._`;
                    await message.reply(response);

                    try {
                        const media = MessageMedia.fromFilePath(CASOS_FILE_PATH);
                        await message.reply(media, undefined, { caption: "📂 Registro completo de casos." });
                    } catch (e) {
                        console.error("Error enviando casos.json:", e);
                    }
                    return null;
                }
                return response;

            default:
                return 'Comando de caso no válido.';
        }
    } finally {
        casoMutex.release(); // 🔓 Liberamos el archivo siempre
    }
}

module.exports = {
    handleTicket,
    handleCaso
};