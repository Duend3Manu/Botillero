// En: src/services/gemini.service.js (VERSIÓN CON EL MODELO CORRECTO)
"use strict";

const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("La API Key de Gemini no está configurada en el archivo .env");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// --- LÍNEA FINAL Y CORRECTA ---
// Usamos el nombre del modelo estable que descubrimos con el script de prueba.
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

/**
 * Función central para enviar cualquier texto a Gemini y obtener una respuesta.
 * @param {string} prompt El texto o la pregunta que se enviará a la IA.
 * @returns {Promise<string>} La respuesta generada por la IA.
 */
async function generateText(prompt) {
    if (!API_KEY) return "El servicio de IA no está configurado.";

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error al generar texto con Gemini:", error);
        return "Hubo un error al conectar con el servicio de IA. Revisa la consola para más detalles.";
    }
}

module.exports = {
    generateText
};