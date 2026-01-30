// src/services/transbank.service.js
"use strict";

const pythonService = require('./python.service');

const TRANSBANK_SCRIPT = 'transbank.py';

// Variables para caché
let transbankCache = null;
let lastUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos (Transbank no suele cambiar de estado tan rápido)

let monitoringInterval = null;
let lastAlertState = false; // Para evitar spam de alertas repetidas

async function getTransbankStatus() {
    // 1. Revisar caché
    if (transbankCache && (Date.now() - lastUpdate < CACHE_TTL)) {
        return transbankCache;
    }

    try {
        // Ejecutar script Python usando el servicio unificado
        const result = await pythonService.executeScript(TRANSBANK_SCRIPT);
        
        // El script ahora devuelve texto formateado por defecto
        // Si hay error técnico en la ejecución (exit code != 0)
        if (result.code !== 0) {
            console.error('Error ejecutando transbank.py:', result.stderr);
            throw new Error(result.stderr || 'Error técnico en script');
        }

        // 2. Guardar en caché
        transbankCache = result.stdout;
        lastUpdate = Date.now();

        // Devolver directamente la salida formateada del script
        return result.stdout;

    } catch (error) {
        console.error('Error en servicio Transbank:', error);
        
        // 3. Fallback: Si tenemos datos antiguos, los mostramos
        if (transbankCache) {
            return `${transbankCache}\n\n_(⚠️ No pude actualizar el estado, mostrando último registro)_`;
        }

        return '⚠️ Ocurrió un error al consultar el estado de Transbank.';
    }
}

/**
 * Inicia el monitoreo automático de Transbank.
 * Revisa cada 10 minutos si hay caídas masivas.
 */
function startTransbankMonitoring(client) {
    if (monitoringInterval) clearInterval(monitoringInterval);
    console.log('(Transbank) -> Iniciando monitoreo automático...');

    monitoringInterval = setInterval(async () => {
        try {
            // Pedimos JSON puro para analizar
            const result = await pythonService.executeScript(TRANSBANK_SCRIPT, ['--json']);
            
            if (result.code === 0 && result.json) {
                const data = result.json;
                const criticalServices = [];

                for (const [service, status] of Object.entries(data)) {
                    if (status === 'Major Outage') {
                        criticalServices.push(service);
                    }
                }

                if (criticalServices.length > 0 && !lastAlertState) {
                    lastAlertState = true;
                    const msg = `🚨 *ALERTA TRANSBANK* 🚨\n\nSe reporta CAÍDA MASIVA (Major Outage) en:\n- ${criticalServices.join('\n- ')}\n\nPosiblemente no se puedan realizar pagos.`;
                    
                    // Enviar a todos los grupos
                    const chats = await client.getChats();
                    const groups = chats.filter(c => c.isGroup);
                    for (const group of groups) {
                        await client.sendMessage(group.id._serialized, msg);
                    }
                } else if (criticalServices.length === 0 && lastAlertState) {
                    lastAlertState = false; // Resetear estado si ya se arregló
                }
            }
        } catch (e) {
            console.error('(Transbank) -> Error en monitoreo:', e.message);
        }
    }, 10 * 60 * 1000); // Revisar cada 10 minutos
}

module.exports = { getTransbankStatus, startTransbankMonitoring };