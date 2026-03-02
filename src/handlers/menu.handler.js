// src/handlers/menu.handler.js
"use strict";

/**
 * Handler de menú mejorado para Telegram con InlineKeyboard buttons
 */

// Menú principal con categorías
function getMainMenuKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '🛠️ Servicios', callback_data: 'cat_servicios' },
                { text: '🔍 Búsquedas', callback_data: 'cat_busquedas' }
            ],
            [
                { text: '⚽ Fútbol', callback_data: 'cat_futbol' },
                { text: '🎉 Diversión', callback_data: 'cat_diversion' }
            ],
            [
                { text: '📋 Gestión', callback_data: 'cat_gestion' },
                { text: '📡 Red', callback_data: 'cat_red' }
            ],
            [
                { text: '❓ Ver todos los comandos', callback_data: 'all_commands' }
            ]
        ]
    };
}

// Menú de servicios
function getServiciosMenuKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '☀️ Clima', callback_data: 'cmd_clima' },
                { text: '💵 Valores', callback_data: 'cmd_valores' }
            ],
            [
                { text: '🎉 Feriados', callback_data: 'cmd_feriados' },
                { text: '💊 Farmacias', callback_data: 'cmd_far' }
            ],
            [
                { text: '🚇 Metro', callback_data: 'cmd_metro' },
                { text: '🌋 Sismos', callback_data: 'cmd_sismos' }
            ],
            [
                { text: '🚌 Bus', callback_data: 'cmd_bus' },
                { text: '⚡ SEC', callback_data: 'cmd_sec' }
            ],
            [
                { text: '💳 Transbank', callback_data: 'cmd_transbank' },
                { text: '🏦 Bancos', callback_data: 'cmd_bancos' }
            ],
            [
                { text: '🔧 Ping', callback_data: 'cmd_ping' }
            ],
            [{ text: '⬅️ Volver', callback_data: 'menu_main' }]
        ]
    };
}

// Menú de búsquedas
function getBusquedasMenuKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '📚 Wikipedia', callback_data: 'cmd_wiki' },
                { text: '🔎 Google', callback_data: 'cmd_g' }
            ],
            [
                { text: '📰 Noticias', callback_data: 'cmd_noticias' },
                { text: '🚗 Patente', callback_data: 'cmd_pat' }
            ],
            [
                { text: '📱 Número', callback_data: 'cmd_num' },
                { text: '🎲 Random', callback_data: 'cmd_random' }
            ],
            [{ text: '⬅️ Volver', callback_data: 'menu_main' }]
        ]
    };
}

// Menú de fútbol
function getFutbolMenuKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '🏆 Tabla Liga', callback_data: 'cmd_tabla' },
                { text: '📅 Partidos', callback_data: 'cmd_partidos' }
            ],
            [
                { text: '📆 Próximos', callback_data: 'cmd_prox' },
                { text: '🇨🇱 Clasificatorias', callback_data: 'cmd_clasi' }
            ],
            [
                { text: '🏅 Tabla Clasif.', callback_data: 'cmd_tclasi' }
            ],
            [{ text: '⬅️ Volver', callback_data: 'menu_main' }]
        ]
    };
}

// Menú de diversión
function getDiversionMenuKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '🎨 Sticker', callback_data: 'cmd_s' },
                { text: '🎵 Audios', callback_data: 'cmd_audios' }
            ],
            [
                { text: '😂 Chiste', callback_data: 'cmd_chiste' },
                { text: '🖼️ Sticker → Img', callback_data: 'cmd_toimg' }
            ],
            [
                { text: '🎰 Ruleta', callback_data: 'cmd_ruleta' },
                { text: '🏆 Puntos', callback_data: 'cmd_puntos' }
            ],
            [
                { text: '🥇 Ranking', callback_data: 'cmd_ranking' },
                { text: '🔮 Horóscopo', callback_data: 'cmd_horoscopo' }
            ],
            [
                { text: '⏳ Countdowns', callback_data: 'submenu_countdowns' }
            ],
            [{ text: '⬅️ Volver', callback_data: 'menu_main' }]
        ]
    };
}

// Menú de gestión
function getGestionMenuKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '🎫 Ticket', callback_data: 'cmd_ticket' },
                { text: '👮 Caso', callback_data: 'cmd_caso' }
            ],
            [
                { text: '👥 Mencionar todos', callback_data: 'cmd_todos' },
                { text: '🆔 ID Chat', callback_data: 'cmd_id' }
            ],
            [{ text: '⬅️ Volver', callback_data: 'menu_main' }]
        ]
    };
}

// Menú de red
function getRedMenuKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '🌐 WHOIS', callback_data: 'cmd_whois' },
                { text: '🇨🇱 NIC Chile', callback_data: 'cmd_nic' }
            ],
            [{ text: '⬅️ Volver', callback_data: 'menu_main' }]
        ]
    };
}

// Información de comandos individuales
const commandInfo = {
    clima: '☀️ *Comando: !clima*\n\nObtiene el pronóstico del tiempo para una ciudad.\n\n*Uso:* `!clima Santiago`\n`!clima Valparaíso`',
    valores: '💵 *Comando: !valores*\n\nMuestra indicadores económicos actualizados (UF, Dólar, Euro).\n\n*Uso:* `!valores`',
    feriados: '🎉 *Comando: !feriados*\n\nMuestra los próximos feriados en Chile.\n\n*Uso:* `!feriados`',
    far: '💊 *Comando: !far*\n\nBusca farmacias de turno en una comuna.\n\n*Uso:* `!far Santiago`\n`!far Providencia`',
    metro: '🚇 *Comando: !metro*\n\nMuestra el estado actual del Metro de Santiago.\n\n*Uso:* `!metro`',
    sismos: '🌋 *Comando: !sismos*\n\nMuestra los últimos sismos registrados en Chile.\n\n*Uso:* `!sismos`',
    bus: '🚌 *Comando: !bus*\n\nMuestra la llegada de micros del sistema RED.\n\n*Uso:* `!bus PA433`',
    sec: '⚡ *Comando: !sec*\n\nMuestra cortes de luz programados.\n\n*Uso:* `!sec` (nacional)\n`!secrm` (solo RM)',
    transbank: '💳 *Comando: !transbank*\n\nVerifica el estado de los servicios de Transbank.\n\n*Uso:* `!transbank`',
    bancos: '🏦 *Comando: !bancos*\n\nVerifica el estado de los sitios web de bancos chilenos.\n\n*Uso:* `!bancos`',
    ping: '🔧 *Comando: !ping*\n\nMuestra el estado y latencia del bot.\n\n*Uso:* `!ping`',
    wiki: '📚 *Comando: !wiki*\n\nBusca información en Wikipedia.\n\n*Uso:* `!wiki Chile`',
    g: '🔎 *Comando: !g*\n\nRealiza una búsqueda en Google.\n\n*Uso:* `!g mejores empanadas Chile`',
    noticias: '📰 *Comando: !noticias*\n\nMuestra titulares de noticias recientes.\n\n*Uso:* `!noticias`',
    pat: '🚗 *Comando: !pat*\n\nBusca información de un vehículo por patente.\n\n*Uso:* `!pat ABCD12`',
    num: '📱 *Comando: !num*\n\nBusca información de un número telefónico.\n\n*Uso:* `!num +56912345678`',
    random: '🎲 *Comando: !random*\n\nMuestra un dato curioso aleatorio.\n\n*Uso:* `!random`',
    tabla: '🏆 *Comando: !tabla*\n\nMuestra la tabla de posiciones de la liga chilena.\n\n*Uso:* `!tabla`',
    partidos: '📅 *Comando: !partidos*\n\nMuestra resumen de la fecha actual.\n\n*Uso:* `!partidos`',
    prox: '📆 *Comando: !prox*\n\nMuestra los próximos partidos de la liga.\n\n*Uso:* `!prox`',
    clasi: '🇨🇱 *Comando: !clasi*\n\nMuestra partidos de las clasificatorias.\n\n*Uso:* `!clasi`',
    tclasi: '🏅 *Comando: !tclasi*\n\nMuestra la tabla de clasificatorias.\n\n*Uso:* `!tclasi`',
    s: '🎨 *Comando: !s*\n\nCrea un sticker desde una imagen, GIF o video.\n\n*Uso:* Responde a una imagen con `!s`',
    audios: '🎵 *Comando: !audios*\n\nMuestra la lista de comandos de audio disponibles.\n\n*Uso:* `!audios`',
    chiste: '😂 *Comando: !chiste*\n\nCuenta un chiste aleatorio en audio.\n\n*Uso:* `!chiste`',
    toimg: '🖼️ *Comando: !toimg*\n\nConvierte un sticker en imagen.\n\n*Uso:* Responde a un sticker con `!toimg`',
    horoscopo: '🔮 *Comando: !horoscopo*\n\nMuestra tu horóscopo del día.\n\n*Uso:* `!horoscopo aries`\n`!horoscopo tauro`',
    ruleta: '🎰 *Comando: !ruleta*\n\n¡Ruleta de premios! Gira la ruleta y gana puntos.\n\n*Premios:*\n• 0 pts (30%)\n• 10 pts (40%)\n• 50 pts (15%)\n• 100 pts (10%)\n• 500 pts (5%)\n\n*Uso:* `!ruleta`\n\n⏱️ Cooldown de 5s por usuario\n⚠️ Anti-spam activado',
    puntos: '🏆 *Comando: !puntos*\n\nMuestra tu cantidad total de puntos ganados.\n\n*Uso:* `!puntos`',
    ranking: '🥇 *Comando: !ranking*\n\nMuestra el top 10 de jugadores con más puntos.\n\n*Uso:* `!ranking`',
    ticket: '🎫 *Comando: !ticket*\n\nCrea o gestiona tickets.\n\n*Uso:* `!ticket Mi problema`\n`!ticketr 1` (resolver)\n`!tickete 1` (eliminar)',
    caso: '👮 *Comando: !caso*\n\nRegistra un caso aislado.\n\n*Uso:* `!caso Descripción del caso`\n`!icaso` (listar casos)',
    todos: '👥 *Comando: !todos*\n\nMenciona a todos los miembros del grupo.\n\n*Uso:* `!todos`',
    id: '🆔 *Comando: !id*\n\nMuestra el ID del chat actual.\n\n*Uso:* `!id`',
    whois: '🌐 *Comando: !whois*\n\nConsulta información WHOIS de un dominio o IP.\n\n*Uso:* `!whois google.com`',
    nic: '🇨🇱 *Comando: !nic*\n\nBusca información de dominios .cl\n\n*Uso:* `!nic chile.cl`'
};

module.exports = {
    getMainMenuKeyboard,
    getServiciosMenuKeyboard,
    getBusquedasMenuKeyboard,
    getFutbolMenuKeyboard,
    getDiversionMenuKeyboard,
    getGestionMenuKeyboard,
    getRedMenuKeyboard,
    commandInfo
};
