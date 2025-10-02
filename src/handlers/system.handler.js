// src/handlers/system.handler.js
"use strict";

const os = require('os');
const si = require('systeminformation');
const axios = require('axios');

// --- Funciones auxiliares para obtener métricas del sistema ---

// Mide el tiempo de respuesta a Internet (ping)
async function checkPing() {
    try {
        const start = Date.now();
        await axios.get('https://www.google.cl');
        const end = Date.now();
        return end - start;
    } catch (error) {
        console.error('Error al medir el ping:', error);
        return null;
    }
}

// Obtiene el uso de RAM
function getRAMUsage() {
    const totalRAM = os.totalmem();
    const freeRAM = os.freemem();
    const usedRAM = totalRAM - freeRAM;
    return {
        used: (usedRAM / 1024 / 1024).toFixed(2),
        total: (totalRAM / 1024 / 1024).toFixed(2),
        percentage: ((usedRAM / totalRAM) * 100).toFixed(2),
    };
}

// Obtiene el uso de CPU
async function getCPUUsage() {
    try {
        const cpuData = await si.currentLoad();
        const cpuInfo = await si.cpu();
        return {
            usage: cpuData.currentLoad.toFixed(2),
            model: cpuInfo.manufacturer + ' ' + cpuInfo.brand,
        };
    } catch (error) {
        console.error('Error al obtener el uso de CPU:', error);
        return { usage: 'N/A', model: os.cpus()[0].model }; // Fallback
    }
}

// Obtiene el uso de disco
async function getDiskUsage() {
    try {
        const disks = await si.fsSize();
        const disk = disks[0]; // Tomar la primera partición
        return {
            used: (disk.used / 1024 / 1024 / 1024).toFixed(2),
            total: (disk.size / 1024 / 1024 / 1024).toFixed(2),
            percentage: disk.use.toFixed(2),
        };
    } catch (error) {
        console.error('Error al obtener el uso de disco:', error);
        return null;
    }
}

// Formatea el tiempo de actividad del sistema
function formatUptime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}

// --- Función principal del manejador ---

async function handlePing(message) {
    const startCommandTime = Date.now();
    
    // Obtenemos todas las métricas en paralelo para mayor eficiencia
    const [pingTime, ramUsage, cpuUsage, diskUsage] = await Promise.all([
        checkPing(),
        getRAMUsage(),
        getCPUUsage(), // Ahora es una función asíncrona
        getDiskUsage()
    ]);

    const lag = Date.now() - startCommandTime;
    const uptime = formatUptime(os.uptime());

    // Construimos el mensaje de respuesta
    const response = `
*Estado del Sistema - Botillero* ⚙️
    
🏓 *Ping a Google:* ${pingTime} ms
⏳ *Latencia del comando:* ${lag} ms
💾 *RAM:* ${ramUsage.used} / ${ramUsage.total} MB (${ramUsage.percentage}%)
⚡ *CPU:* ${cpuUsage.usage}% (${cpuUsage.model})
💽 *Disco:* ${diskUsage.used} / ${diskUsage.total} GB (${diskUsage.percentage}%)
⏱️ *Tiempo de actividad:* ${uptime}
    `.trim();

    return response;
}

module.exports = { handlePing };