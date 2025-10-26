// src/handlers/network.handler.js
"use strict";

const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const whois = require('whois');

const lookup = util.promisify(whois.lookup);

/**
 * Ejecuta el script de Python net_analyzer.py y devuelve el resultado.
 * @param {import('whatsapp-web.js').Message} message - El objeto del mensaje original.
 */
async function handleNetworkQuery(message) {
    // Extraemos el argumento buscando el primer espacio, para que funcione con ! y /
    const firstSpaceIndex = message.body.indexOf(' ');
    const query = (firstSpaceIndex !== -1) 
        ? message.body.substring(firstSpaceIndex + 1).trim() 
        : '';

    if (!query) {
        return message.reply("Debes ingresar un dominio o IP. Ejemplo: `!whois google.cl`");
    }

    // Enviamos un mensaje de espera para notificar al usuario.
    await message.reply(`Consultando información de red para *${query}*. Esto puede tardar un momento... ⌛`);

    // Usamos exec para manejar mejor la salida completa del script.
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'python', 'net_analyzer.py');
    const command = `python "${scriptPath}" ${query}`;

    // Envolvemos la ejecución en una promesa para poder usar async/await.
    return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error al ejecutar el script de Python: ${error.message}`);
                console.error(`Stderr: ${stderr}`);
                resolve(message.reply(`❌ Hubo un error al analizar "${query}".\n\n*Detalle:* \`\`\`${stderr || error.message}\`\`\``));
            } else {
                resolve(message.reply(stdout.trim()));
            }
        });
    });
}

// --- Función para !nic (CORREGIDA Y MÁS ROBUSTA) ---
async function handleNicClSearch(message) {
    let domain = message.body.substring(message.body.indexOf(' ') + 1).trim().toLowerCase();
    if (!domain) {
        return "Por favor, ingresa un dominio .cl para consultar. Ejemplo: `!nic google.cl`";
    }
    if (!domain.endsWith('.cl')) {
        domain += '.cl';
    }

    await message.react('⏳');

    try {
        const rawData = await lookup(domain, { server: 'whois.nic.cl', encoding: 'latin1' });

        if (rawData.includes('no existe')) {
            await message.react('❌');
            return `El dominio *${domain}* no se encuentra registrado en NIC Chile.`;
        }
        
        const parseNicCl = (data) => {
            const lines = data.split('\n');
            const result = { 'Titular': '', 'Agente Registrador': '', 'Fecha de creación': '', 'Fecha de expiración': '', 'Servidores de Nombre': [] };
            lines.forEach(line => {
                if (line.includes(':')) {
                    const [key, ...valueParts] = line.split(':');
                    const keyTrim = key.trim();
                    const valueTrim = valueParts.join(':').trim();
                    if (keyTrim === 'Titular') result['Titular'] = valueTrim;
                    if (keyTrim === 'Agente Registrador') result['Agente Registrador'] = valueTrim;
                    if (keyTrim === 'Fecha de creación') result['Fecha de creación'] = valueTrim;
                    if (keyTrim === 'Fecha de expiración') result['Fecha de expiración'] = valueTrim;
                    if (keyTrim.startsWith('Servidor de Nombre')) result['Servidores de Nombre'].push(valueTrim);
                }
            });
            return result;
        };
        
        const parsedData = parseNicCl(rawData);

        const reply = `
*🇨🇱 Información de NIC Chile para "${domain}"*

- *Titular:* ${parsedData['Titular']}
- *Registrador:* ${parsedData['Agente Registrador']}
- *Fecha de Creación:* ${parsedData['Fecha de creación']}
- *Fecha de Expiración:* ${parsedData['Fecha de expiración']}

*Servidores de Nombre (NS):*
${parsedData['Servidores de Nombre'].map(ns => `- \`${ns}\``).join('\n')}
        `.trim();

        await message.react('✅');
        return reply;

    } catch (error) {
        console.error("Error en handleNicClSearch:", error);
        await message.react('❌');

        // Mensaje específico para el error de conexión
        if (error.code === 'ECONNRESET') {
            return `😕 La conexión con el servidor de NIC.cl fue interrumpida. Esto suele ser un problema temporal del servidor de ellos. Por favor, intenta de nuevo en un minuto.`;
        }
        
        return `No se pudo encontrar información para *${domain}*.`;
    }
}


module.exports = {
    handleNetworkQuery,
    handleNicClSearch
};
