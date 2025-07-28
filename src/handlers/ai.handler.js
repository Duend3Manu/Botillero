// src/handlers/ai.handler.js
"use strict";

// Esta es nuestra "base de conocimiento". Mapea palabras clave a comandos.
const commandKnowledgeBase = [
    { keywords: ['valores', 'dolar', 'uf', 'economia', 'finanzas'], command: '!valores' },
    { keywords: ['clima', 'tiempo', 'temperatura'], command: '!clima [ciudad]' },
    { keywords: ['feriado', 'festivo'], command: '!feriados' },
    { keywords: ['farmacia', 'remedios'], command: '!far [comuna]' },
    { keywords: ['tabla', 'posiciones', 'liga'], command: '!tabla' },
    { keywords: ['partidos', 'fecha', 'futbol'], command: '!prox' },
    { keywords: ['seleccion', 'chilena', 'clasificatorias'], command: '!tclasi o !clasi' },
    { keywords: ['metro', 'subterraneo'], command: '!metro' },
    { keywords: ['patente', 'auto', 'vehiculo'], command: '!pat [patente]' },
    { keywords: ['sticker', 'stiker', 's'], command: '!s' },
    { keywords: ['audio', 'sonido', 'ruido'], command: '!audios' },
    { keywords: ['sismo', 'temblor'], command: '!sismos' },
    { keywords: ['micro', 'paradero', 'bus'], command: '!bus [código]' },
    { keywords: ['luz', 'corte', 'sec'], command: '!sec [región]' },
    { keywords: ['ping', 'estado', 'sistema'], command: '!ping' },
    { keywords: ['ticket', 'tarea', 'recordatorio'], command: '!ticket' },
    { keywords: ['caso', 'aislado', 'incidente'], command: '!caso' },
    { keywords: ['ayuda', 'comando', 'menu'], command: '!menu' }
];

async function handleAiHelp(message) {
    const userQuery = message.body.substring(message.body.indexOf(' ') + 1).toLowerCase().trim();

    if (!userQuery || userQuery === 'ayuda') {
        return "¡Wena wn! Soy Botillero. Dime qué necesitas hacer y te ayudaré a encontrar el comando correcto. 🤖 Por ejemplo: `!ayuda quiero saber el clima en valparaíso`";
    }

    // Buscamos una coincidencia en nuestra base de conocimiento
    for (const entry of commandKnowledgeBase) {
        for (const keyword of entry.keywords) {
            if (userQuery.includes(keyword)) {
                // ¡Encontramos una coincidencia!
                const response = `
🤖 ¡Ya cache! Creo que este es el comando que buscas:

Para lo que necesitas, el comando correcto es:
👉 *${entry.command}*

Inténtalo y avísame , y si te sirve bakan, y si no, me importa hectareas de....
                `.trim();
                return response;
            }
        }
    }

    // Si no encontramos ninguna coincidencia
    return "Las Weas, no cacho qué comando podría ayudarte con eso. 🤔\n\nPrueba a ser más específico wn o escribe `!menu` para ver la lista completa de comandos.";
}

module.exports = {
    handleAiHelp
};