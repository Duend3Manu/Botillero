"use strict";

const os = require('os');
const si = require('systeminformation');
const axios = require('axios');
const moment = require('moment-timezone');
require('moment-duration-format');
const { version } = require('../../package.json');

// --- Función para medir el ping a un servidor externo ---
async function checkPing() {
    try {
        const start = Date.now();
        await axios.get('https://www.google.cl', { timeout: 5000 });
        return `${Date.now() - start} ms`;
    } catch (error) {
        console.error('Error al medir el ping a Google:', error);
        return 'No disponible';
    }
}

// --- Función principal del manejador (unificada) ---
async function handlePing(message, client) {
    try {
        // --- Métricas del Bot (las que añadimos) ---
        const botLatency = (Date.now() / 1000) - message.timestamp;
        const botUptimeSeconds = process.uptime();
        const botUptime = moment.duration(botUptimeSeconds, 'seconds').format("d[d], h[h], m[m], s[s]");
        const botRamUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        const chats = await client.getChats();
        const chatCount = chats.length;

        // --- Métricas del Servidor (tu lógica original) ---
        const [pingTime, cpuInfo, ramInfo, diskInfo, osInfo] = await Promise.all([
            checkPing(),
            si.currentLoad(),
            si.mem(),
            si.fsSize(),
            si.osInfo()
        ]);

        const mainDisk = diskInfo[0] || {}; // Tomamos el primer disco
        const cpuUsage = cpuInfo.currentLoad.toFixed(2);
        const ramUsage = ((ramInfo.total - ramInfo.free) / 1024 / 1024 / 1024).toFixed(2);
        const totalRam = (ramInfo.total / 1024 / 1024 / 1024).toFixed(2);
        const diskUsage = (mainDisk.used / 1024 / 1024 / 1024).toFixed(2);
        const totalDisk = (mainDisk.size / 1024 / 1024 / 1024).toFixed(2);

        // --- Construimos el mensaje de respuesta unificado ---
        const response = `
*🤖 Estado del Botillero y Sistema ⚙️*

--- *BOT* ---
◦ *Versión:* v${version} 📦
◦ *Latencia:* ${botLatency.toFixed(3)} s 핑
◦ *Tiempo Activo:* ${botUptime} ⏱️
◦ *Uso de RAM:* ${botRamUsage} MB 💾
◦ *Chats Activos:* ${chatCount} 💬

--- *SERVIDOR* ---
◦ *Plataforma:* ${osInfo.platform} (${osInfo.distro}) 💻
◦ *Ping a Google:* ${pingTime} 🌐
◦ *Uso de CPU:* ${cpuUsage}% ⚡
◦ *Uso de RAM:* ${ramUsage} / ${totalRam} GB 🧠
◦ *Uso de Disco:* ${diskUsage} / ${totalDisk} GB 💽
        `.trim();

        return response;

    } catch (error) {
        console.error("Error al generar el estado del sistema:", error);
        return "Ucha, no pude obtener el estado completo del sistema. Algo falló.";
    }
}

module.exports = { handlePing };