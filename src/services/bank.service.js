// src/services/bank.service.js
"use strict";

const axios = require('axios');

const BANKS = [
    { name: 'BancoEstado', url: 'https://www.bancoestado.cl' },
    { name: 'Banco de Chile', url: 'https://portales.bancochile.cl/' },
    { name: 'Santander', url: 'https://banco.santander.cl/' },
    { name: 'BCI', url: 'https://www.bci.cl/' },
    { name: 'Scotiabank', url: 'https://www.scotiabankchile.cl/' },
    { name: 'Itaú', url: 'https://www.itau.cl/' },
    { name: 'Falabella', url: 'https://www.bancofalabella.cl/' },
    { name: 'Banco Ripley', url: 'https://www.bancoripley.cl/' },
    { name: 'Banco Security', url: 'https://www.security.cl/' },
    { name: 'Banco Consorcio', url: 'https://www.bancoconsorcio.cl/' },
    { name: 'Banco Internacional', url: 'https://www.bancointernacional.cl/' },
    { name: 'BICE', url: 'https://www.bice.cl/' },
    { name: 'Coopeuch', url: 'https://www.coopeuch.cl/' },
    { name: 'Tenpo', url: 'https://www.tenpo.cl/' }
];

// Cache para evitar consultar constantemente
let banksCache = null;
let lastUpdate = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos

async function checkUrl(url) {
    try {
        const start = Date.now();
        await axios.get(url, { 
            timeout: 3000,  // Reducido de 5s a 3s
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const latency = Date.now() - start;
        return { status: 'OK', latency };
    } catch (error) {
        return { status: 'DOWN', error: error.message };
    }
}

async function getBanksStatus() {
    // Revisar cache
    if (banksCache && (Date.now() - lastUpdate < CACHE_TTL)) {
        return banksCache;
    }

    const results = await Promise.all(BANKS.map(async (bank) => {
        const status = await checkUrl(bank.url);
        return { ...bank, ...status };
    }));

    // Ordenar por estado (online primero) y luego por velocidad
    results.sort((a, b) => {
        if (a.status === 'OK' && b.status !== 'OK') return -1;
        if (a.status !== 'OK' && b.status === 'OK') return 1;
        if (a.status === 'OK' && b.status === 'OK') {
            return a.latency - b.latency; // Más rápido primero
        }
        return 0;
    });

    // Estadísticas
    const onlineCount = results.filter(b => b.status === 'OK').length;
    const totalCount = results.length;

    let message = `🏦 *Estado de Sitios Web Bancarios* 🏦\n\n`;
    message += `📊 *Resumen:* ${onlineCount}/${totalCount} bancos online\n\n`;
    
    results.forEach(bank => {
        if (bank.status === 'OK') {
            // Emojis según velocidad
            let speedEmoji = '🟢';
            if (bank.latency > 2000) speedEmoji = '🟡';
            if (bank.latency > 3000) speedEmoji = '🔴';
            
            message += `${speedEmoji} *${bank.name}:* ${bank.latency}ms\n`;
        } else {
            message += `❌ *${bank.name}:* Caído o lento\n`;
        }
    });

    message += `\n_Actualizado: ${new Date().toLocaleTimeString('es-CL')}_`;

    // Guardar en cache
    banksCache = message;
    lastUpdate = Date.now();

    return message;
}

module.exports = { getBanksStatus };