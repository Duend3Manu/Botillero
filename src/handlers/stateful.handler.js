// src/handlers/stateful.handler.js
"use strict";

const fs = require('fs');
const path = require('path');

const TICKET_FILE_PATH = path.join(__dirname, '..', '..', 'ticket.json');
const CASOS_FILE_PATH = path.join(__dirname, '..', '..', 'casos.json');

// --- Funciones auxiliares para leer/escribir JSON ---
function readJsonFile(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf8');
        return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
}

function writeJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}


// --- Lógica para el sistema de Tickets ---
function handleTicket(message) {
    const args = message.body.split(' ');
    const subCommand = args[0].substring(1); // ej: 'ticket', 'ticketr', 'tickete'
    const value = args.slice(1).join(' ');
    const tickets = readJsonFile(TICKET_FILE_PATH);

    switch (subCommand) {
        case 'ticket':
            if (!value) { // Listar tickets
                if (tickets.length === 0) return 'No hay tickets guardados.';
                let response = '🎟️ *Tickets guardados:*\n\n';
                tickets.forEach((ticket, index) => {
                    response += `${index + 1}. ${ticket.text} ${ticket.resolved ? '✅' : '⏳'}\n`;
                });
                return response;
            } else { // Crear ticket
                tickets.push({ text: value, resolved: false });
                writeJsonFile(TICKET_FILE_PATH, tickets);
                return 'Ticket guardado exitosamente ⏳.';
            }

        case 'ticketr': // Resolver ticket
            const ticketRNum = parseInt(value) - 1;
            if (tickets[ticketRNum]) {
                tickets[ticketRNum].resolved = true;
                writeJsonFile(TICKET_FILE_PATH, tickets);
                return `El ticket ${value} ha sido marcado como resuelto ✅.`;
            }
            return 'Número de ticket inválido.';

        case 'tickete': // Eliminar ticket
            const ticketENum = parseInt(value) - 1;
            if (tickets[ticketENum]) {
                tickets.splice(ticketENum, 1);
                writeJsonFile(TICKET_FILE_PATH, tickets);
                return `El ticket ${value} ha sido eliminado.`;
            }
            return 'Número de ticket inválido.';
        
        default:
            return 'Comando de ticket no válido.';
    }
}


// --- Lógica para el sistema de Casos Aislados ---
function handleCaso(message) {
    const args = message.body.split(' ');
    const subCommand = args[0].substring(1); // ej: 'caso', 'ecaso', 'icaso'
    const value = args.slice(1).join(' ');
    const casos = readJsonFile(CASOS_FILE_PATH);

    switch(subCommand) {
        case 'caso': // Crear caso
            const nuevoCaso = {
                descripcion: `Caso Aislado Número ${casos.length + 1}: ${value}`,
                enlace: value,
                fecha_ingreso: new Date().toISOString()
            };
            casos.push(nuevoCaso);
            writeJsonFile(CASOS_FILE_PATH, casos);
            return `Caso Aislado Número ${casos.length} registrado.`;

        case 'ecaso': // Eliminar último caso
            if (casos.length > 0) {
                casos.pop();
                writeJsonFile(CASOS_FILE_PATH, casos);
                return `Se eliminó el último caso. Ahora hay ${casos.length} casos.`;
            }
            return 'No hay casos para eliminar.';
        
        case 'icaso': // Listar casos
            if (casos.length === 0) return 'No hay casos registrados.';
            let response = '👮🏽 *Casos Aislados Registrados:*\n\n';
            casos.forEach((caso, index) => {
                response += `${index + 1}. ${caso.descripcion}\n`;
            });
            response += `\nActualmente hay ${casos.length} casos registrados.`;
            return response;

        default:
            return 'Comando de caso no válido.';
    }
}

module.exports = {
    handleTicket,
    handleCaso
};