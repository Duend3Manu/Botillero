// src/handlers/network.handler.js
"use strict";

const whois = require('whois');
const dns = require('dns').promises;
const util = require('util');
const axios = require('axios');

const lookup = util.promisify(whois.lookup);

async function getWhoisInfo(query) {
    try {
        const rawData = await lookup(query);
        const parseWhois = (data) => {
            const lines = data.split('\n');
            const result = { 'Domain Name': '', 'Registrar': '', 'Creation Date': '', 'Updated Date': '', 'Expiry Date': '', 'Name Server': [], 'Status': [] };
            lines.forEach(line => {
                if (line.includes(':')) {
                    const [key, ...valueParts] = line.split(':');
                    const keyTrim = key.trim();
                    const valueTrim = valueParts.join(':').trim();
                    if (keyTrim.toLowerCase().includes('domain name')) result['Domain Name'] = valueTrim;
                    if (keyTrim.toLowerCase().includes('registrar')) result['Registrar'] = valueTrim;
                    if (keyTrim.toLowerCase().includes('creation date')) result['Creation Date'] = valueTrim;
                    if (keyTrim.toLowerCase().includes('updated date')) result['Updated Date'] = valueTrim;
                    if (keyTrim.toLowerCase().includes('registry expiry date')) result['Expiry Date'] = valueTrim;
                    if (keyTrim.toLowerCase().includes('name server')) result['Name Server'].push(valueTrim);
                    if (keyTrim.toLowerCase().includes('domain status')) result['Status'].push(valueTrim.split(' ')[0]);
                }
            });
            return result;
        };
        const parsed = parseWhois(rawData);
        if (!parsed['Domain Name']) return `*No se pudo parsear el WHOIS.*\n\n\`\`\`${rawData}\`\`\``;

        return `
*📄 Info WHOIS*
- *Dominio:* ${parsed['Domain Name']}
- *Registrador:* ${parsed['Registrar']}
- *Creado:* ${parsed['Creation Date']}
- *Expira:* ${parsed['Expiry Date']}
- *Estado:* ${parsed['Status'].join(', ')}
- *Servidores de Nombre (NS):*\n${parsed['Name Server'].map(ns => `  - \`${ns}\``).join('\n')}
        `.trim();
    } catch (e) {
        return "*📄 Info WHOIS*\n- No se encontró información de registro.";
    }
}

async function getDnsInfo(query) {
    try {
        let dnsResults = '*DNS Records*\n';
        const a = await dns.resolve4(query).catch(() => []);
        if (a.length > 0) dnsResults += `- *A (IPv4):* \`${a.join(', ')}\`\n`;

        const mx = await dns.resolveMx(query).catch(() => []);
        if (mx.length > 0) dnsResults += `- *MX (Correo):* \`${mx[0].exchange}\`\n`;

        const txt = await dns.resolveTxt(query).catch(() => []);
        if (txt.length > 0) dnsResults += `- *TXT:* \`${txt[0][0].substring(0, 50)}...\`\n`;
        
        return dnsResults.trim();
    } catch (e) {
        return "*DNS Records*\n- No se encontraron registros DNS.";
    }
}

async function getGeoIpInfo(ip) {
    if (!ip) return "";
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        const data = response.data;
        if (data.status === 'success') {
            return `
*📍 Geolocalización (IP: ${ip})*
- *País:* ${data.country}
- *Ciudad:* ${data.city}, ${data.regionName}
- *Proveedor:* ${data.isp}
            `.trim();
        }
        return "*📍 Geolocalización*\n- No se pudo obtener la información.";
    } catch (e) {
        return "*📍 Geolocalización*\n- Error al consultar el servicio.";
    }
}

async function handleNetworkQuery(message) {
    const query = message.body.substring(message.body.indexOf(' ') + 1).trim();
    if (!query) {
        return "Por favor, ingresa un dominio o IP. Ejemplo: `!net google.com`";
    }

    await message.react('⏳');
    
    const [whoisInfo, dnsInfo] = await Promise.all([
        getWhoisInfo(query),
        getDnsInfo(query)
    ]);

    let ipToLocate = null;
    const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
    if (ipRegex.test(query)) {
        ipToLocate = query;
    } else {
        const a_records = await dns.resolve4(query).catch(() => []);
        if (a_records.length > 0) {
            ipToLocate = a_records[0];
        }
    }
    
    const geoIpInfo = await getGeoIpInfo(ipToLocate);

    let finalResponse = `*🔎 Análisis de Red para "${query}"*\n\n`;
    finalResponse += `${whoisInfo}\n\n`;
    finalResponse += `${dnsInfo}\n\n`;
    if (geoIpInfo) {
        finalResponse += `${geoIpInfo}`;
    }

    await message.react('✅');
    return finalResponse.trim();
}

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
        return `No se pudo encontrar información para *${domain}*.`;
    }
}

module.exports = {
    handleNetworkQuery,
    handleNicClSearch
};