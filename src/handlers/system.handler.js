// src/handlers/system.handler.js
"use strict";

const os = require('os');
const si = require('systeminformation');
const axios = require('axios');

// --- Funciones auxiliares para obtener métricas del sistema ---

// Mide el tiempo de respuesta a Internet (ping) usando un endpoint ligero y timeout
async function checkPing(timeoutMs = 3000) {
    try {
        const start = Date.now();
        await axios.get('https://www.google.com/generate_204', { timeout: timeoutMs });
        const end = Date.now();
        return end - start;
    } catch (error) {
        // No enchufamos demasiado log para no ensuciar la salida del bot
        return null;
    }
}

// ----------------------
// Caché de métricas y actualizador en background
// ----------------------
const METRICS_CACHE = {
    lastUpdated: 0,
    ping: null,
    ram: getRAMUsage(),
    cpu: { usage: null, model: os.cpus()[0] ? os.cpus()[0].model : 'unknown' },
    disk: null,
};

let metricsUpdaterInterval = null;

async function refreshMetrics() {
    try {
        // Actualizamos en paralelo, pero no esperamos en handlePing
        const [pingRes, cpuRes, diskRes] = await Promise.allSettled([
            checkPing(2000),
            getCPUUsage(),
            getDiskUsage(),
        ]);

        if (pingRes.status === 'fulfilled') METRICS_CACHE.ping = pingRes.value;
        if (cpuRes.status === 'fulfilled') METRICS_CACHE.cpu = cpuRes.value;
        if (diskRes.status === 'fulfilled') METRICS_CACHE.disk = diskRes.value;

        // RAM la obtenemos con la función ligera directamente
        METRICS_CACHE.ram = getRAMUsage();
        METRICS_CACHE.lastUpdated = Date.now();
    } catch (e) {
        // no fallamos si algo va mal; el cache mantiene valores previos
    }
}

function startMetricsUpdater(intervalMs = 2000) {
    if (metricsUpdaterInterval) return;
    // refrescar inmediatamente y luego en interval
    refreshMetrics();
    metricsUpdaterInterval = setInterval(refreshMetrics, intervalMs);
    // no bloquear el proceso al cerrar
    if (metricsUpdaterInterval.unref) metricsUpdaterInterval.unref();
}

// iniciar updater al cargar el módulo
startMetricsUpdater(2000);

// Helper: espera un refresh corto para cold-start (no bloquear demasiado)
function timeoutPromise(ms) {
    return new Promise((res) => setTimeout(res, ms));
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
// Usar systeminformation para obtener carga de CPU (más fiable)
async function getCPUUsage() {
    try {
        const load = await si.currentLoad();
        const model = os.cpus()[0] ? os.cpus()[0].model : 'unknown';
        const usageNum = Number(load.currentload);
        return {
            usage: Number.isFinite(usageNum) ? usageNum : null,
            model: model,
        };
    } catch (error) {
        return { usage: null, model: os.cpus()[0] ? os.cpus()[0].model : 'unknown' };
    }
}

// Obtiene el uso de disco
async function getDiskUsage() {
    try {
        const disks = await si.fsSize();
        if (!Array.isArray(disks) || disks.length === 0) return null;
        const disk = disks[0]; // Tomar la primera partición
        return {
            used: Number(disk.used / 1024 / 1024 / 1024).toFixed(2),
            total: Number(disk.size / 1024 / 1024 / 1024).toFixed(2),
            percentage: disk.use != null ? Number(disk.use).toFixed(2) : null,
        };
    } catch (error) {
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
    
    // Si el cache está vacío (cold-start), intentamos un refresh corto
    if (!METRICS_CACHE.lastUpdated) {
        // esperar hasta 500ms por un refresh para no bloquear demasiado
        await Promise.race([refreshMetrics(), timeoutPromise(500)]);
    }

    // Obtenemos todas las métricas en paralelo para mayor eficiencia
    // Usar valores en caché (actualizados en background) para respuesta rápida
    const cache = METRICS_CACHE;
    const pingTime = cache.ping;
    const ramUsage = cache.ram || getRAMUsage();
    const cpuUsage = cache.cpu || { usage: null, model: os.cpus()[0] ? os.cpus()[0].model : 'unknown' };
    const diskUsage = cache.disk || null;

    const lag = Date.now() - startCommandTime;
    const uptime = formatUptime(os.uptime());

    // Construimos el mensaje de respuesta
    const safe = (v, fallback = 'N/A') => (v === null || v === undefined ? fallback : v);
    const safeNumber = (n, decimals = 2, fallback = 'N/A') => {
        if (n === null || n === undefined) return fallback;
        if (typeof n === 'number' && Number.isFinite(n)) return n.toFixed(decimals);
        const parsed = Number(n);
        return Number.isFinite(parsed) ? parsed.toFixed(decimals) : fallback;
    };

    const ageSec = METRICS_CACHE.lastUpdated ? `${Math.floor((Date.now() - METRICS_CACHE.lastUpdated) / 1000)}s` : 'no disponible';

    const response = `
*Estado del Sistema - Botillero* ⚙️

🏓 *Ping a Google:* ${safe(pingTime, 'no disponible')} ms
⏳ *Latencia del comando:* ${lag} ms
💾 *RAM:* ${safe(ramUsage.used)} / ${safe(ramUsage.total)} MB (${safe(ramUsage.percentage)}%)
⚡ *CPU:* ${safeNumber(cpuUsage.usage, 2, 'no disponible')}% (${safe(cpuUsage.model)})
💽 *Disco:* ${diskUsage ? `${safe(diskUsage.used)} / ${safe(diskUsage.total)} GB (${safe(diskUsage.percentage)}%)` : 'no disponible'}
⏱️ *Tiempo de actividad:* ${uptime}
ℹ️ *Edad de datos:* ${ageSec}
`.trim();

    return response;
}

module.exports = { handlePing };