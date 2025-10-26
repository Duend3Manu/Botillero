// src/utils/secService.js
"use strict";

const axios = require('axios');

// Función para obtener la fecha y hora del servidor de la SEC
async function getServerTime() {
    try {
        const response = await axios.post('https://apps.sec.cl/INTONLINEv1/ClientesAfectados/GetHoraServer', {}, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        });
        const serverTime = response.data[0].FECHA;
        return parseDate(serverTime);
    } catch (error) {
        console.error('Error fetching server time from SEC:', error);
        return null;
    }
}

// Función para parsear la fecha que entrega la SEC
function parseDate(serverTime) {
    if (!serverTime) return null;
    let [date, time] = serverTime.split(' ');
    let [day, month, year] = date.split(/[-/]/);
    let [hour, minute] = time.split(':');
    return {
        anho: parseInt(year),
        mes: parseInt(month),
        dia: parseInt(day),
        hora: parseInt(hour),
        minuto: parseInt(minute)
    };
}

// Función para obtener los datos de clientes afectados
async function fetchData(timeData) {
    try {
        const { anho, mes, dia, hora } = timeData;
        const response = await axios.post('https://apps.sec.cl/INTONLINEv1/ClientesAfectados/GetPorFecha', {
            anho, mes, dia, hora
        }, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching SEC data:', error);
        return null;
    }
}

// Función principal que construye el mensaje para WhatsApp
async function generateWhatsAppMessage(regionFilter = null, highImpactThreshold = 1000) {
    const timeData = await getServerTime();
    if (!timeData) return 'Error al obtener la hora del servidor de la SEC.';

    const data = await fetchData(timeData);
    if (!data) return 'Error al obtener los datos de cortes de suministro.';

    const regionData = {};
    let totalAffected = 0;

    data.forEach(entry => {
        const { NOMBRE_REGION, NOMBRE_COMUNA, CLIENTES_AFECTADOS } = entry;
        totalAffected += CLIENTES_AFECTADOS;
        if (!regionFilter || NOMBRE_REGION.toLowerCase() === regionFilter.toLowerCase()) {
            if (!regionData[NOMBRE_REGION]) {
                regionData[NOMBRE_REGION] = { total_clients: 0, comunas: {} };
            }
            regionData[NOMBRE_REGION].total_clients += CLIENTES_AFECTADOS;
            if (!regionData[NOMBRE_REGION].comunas[NOMBRE_COMUNA]) {
                regionData[NOMBRE_REGION].comunas[NOMBRE_COMUNA] = 0;
            }
            regionData[NOMBRE_REGION].comunas[NOMBRE_COMUNA] += CLIENTES_AFECTADOS;
        }
    });

    const reportTime = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
    let message = `💡🇨🇱 *Clientes Sin Suministro Eléctrico*\nTotal Nacional: *${totalAffected.toLocaleString('es-CL')}* afectados.\n_${reportTime}_\n\n`;

    if (regionFilter && regionData[Object.keys(regionData)[0]]) {
        const regionName = Object.keys(regionData)[0];
        message = `💡 *Detalle para la Región ${regionName}*\nTotal Regional: *${regionData[regionName].total_clients.toLocaleString('es-CL')}* afectados.\n\n`;
        const comunas = Object.entries(regionData[regionName].comunas).sort((a, b) => b[1] - a[1]);
        
        comunas.forEach(([comuna, clients]) => {
            message += `- *${comuna}:* ${clients.toLocaleString('es-CL')} clientes\n`;
        });

    } else if (!regionFilter) {
        const sortedRegions = Object.entries(regionData).sort((a, b) => b[1].total_clients - a[1].total_clients);
        message += "📍 *Detalle por Región:*\n";
        sortedRegions.forEach(([region, details]) => {
            const emoji = details.total_clients > highImpactThreshold ? '⚠️ ' : '';
            message += `- ${emoji}*${region}:* ${details.total_clients.toLocaleString('es-CL')} clientes\n`;
        });
    } else {
        return `No se encontraron datos para la región especificada: *${regionFilter}*.`;
    }
    
    return message.trim();
}

module.exports = {
    generateWhatsAppMessage
};