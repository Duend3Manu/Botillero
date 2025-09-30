// En: src/services/economy.service.js
"use strict";

const axios = require('axios');
const geminiService = require('./gemini.service.js');

// Formateador de moneda para CLP
const formatCurrency = (value) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(value);

async function getEconomicIndicators() {
    try {
        console.log(`(Servicio Economía) -> Obteniendo indicadores desde api.boostr.cl...`);
        
        // Usamos la misma API que tu script de Python
        const response = await axios.get('https://api.boostr.cl/economy/indicators.json');
        const indicadores = response.data.data;

        // 1. Formateamos los datos principales para el mensaje
        const datosFormateados = `
🇺🇸 *Dólar:* ${formatCurrency(indicadores.dolar.value)}
🇪🇺 *Euro:* ${formatCurrency(indicadores.euro.value)}
🇨🇱 *UF:* ${formatCurrency(indicadores.uf.value)}
💰 *UTM:* ${formatCurrency(indicadores.utm.value)}
📈 *IPC (${indicadores.ipc.date.substring(5, 7)}-${indicadores.ipc.date.substring(0, 4)}):* ${indicadores.ipc.value}%
        `.trim();

        // 2. Creamos un prompt más completo para la IA
        const prompt = `
        Actúa como un analista económico relajado para un chat de amigos en Chile.
        Basado en estos indicadores económicos:
        - Dólar: ${indicadores.dolar.value} CLP
        - Euro: ${indicadores.euro.value} CLP
        - UF: ${indicadores.uf.value} CLP
        - UTM: ${indicadores.utm.value} CLP
        - IPC del mes: ${indicadores.ipc.value}%
        Escribe un análisis muy breve y con un emoji para cada uno. Usa un tono chileno, informal y directo.
        Ejemplo: "El dólar está pa' arriba, ojo con las compras en Shein! 💸"
        `.trim();

        // 3. Generamos el análisis con Gemini
        const analysis = await geminiService.generateText(prompt);

        // 4. Devolvemos el mensaje completo
        return `*Indicadores Económicos Hoy* 🤑\n\n${datosFormateados}\n\n*El Análisis del Botillero:*\n${analysis}`;
    } catch (error) {
        console.error("Error en getEconomicIndicators:", error);
        return "No pude obtener los indicadores económicos en este momento. 😔";
    }
}

module.exports = {
  getEconomicIndicators,
};