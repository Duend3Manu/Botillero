// src/services/ai.service.js
"use strict";

const { GoogleGenerativeAI } = require("@google/generative-ai");

// La API Key se carga desde el archivo .env gracias a la configuración en index.js
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Lista de comandos para que la IA los conozca y pueda recomendarlos.
const commandList = `
!clima [ciudad], !valores, !feriados, !far [comuna], !metro, !sismos, !bus [paradero], !sec, !secrm, !bencina [comuna], !trstatus, !bolsa,
!wiki [búsqueda], !g [búsqueda], !noticias, !pat [patente], !num [número], !tne [rut],
!whois [dominio/ip], !nic [dominio.cl],
!s, !toimg, !audios, !chiste, !horoscopo [signo], !18, !navidad, !añonuevo,
!tabla, !partidos, !prox, !tclasi, !clasi,
!ping, !id, !ayuda [duda], !ticket, !caso, !menu
`;

/**
 * Usa la IA de Google para encontrar el comando más adecuado para la consulta de un usuario.
 * @param {string} userQuery - La pregunta o solicitud del usuario.
 * @returns {Promise<string>} - La respuesta generada por la IA.
 */
async function findCommandWithAI(userQuery) {
    if (!process.env.GEMINI_API_KEY) {
        console.error("La API Key de Gemini no está configurada en .env");
        return "Lo siento, compa. La función de ayuda con IA no está configurada correctamente. Falta la API Key.";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
        Eres "Botillero", un asistente de chatbot para WhatsApp en un grupo de amigos chilenos. Tu personalidad es relajada, amigable y usas modismos chilenos como "wena", "compa", "cachai", "al tiro".
        Un usuario necesita ayuda para encontrar un comando. Tu tarea es analizar su pregunta y, basándote en la siguiente lista de comandos disponibles, determinar cuál es el más adecuado.

        Lista de comandos disponibles:
        ${commandList}

        Pregunta del usuario: "${userQuery}"

        Responde de forma breve y directa. Si encuentras un comando, di algo como "¡Wena! Pa' eso, usa el comando: !comando [parámetros]". Si no estás seguro, sugiere que use !menu o que sea más específico. No inventes comandos que no existen en la lista.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

/**
 * Usa la IA para explicar los problemas de Transbank en lenguaje simple.
 * @param {Object} failingServices - Un objeto con los servicios que fallan y su estado.
 * @returns {Promise<string>} - La explicación generada por la IA.
 */
async function explainTransbankStatusWithAI(failingServices) {
    if (!process.env.GEMINI_API_KEY) {
        return "La función de IA no está configurada. Hay problemas en Transbank, pero no puedo explicarlos.";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const servicesText = JSON.stringify(failingServices, null, 2);

    const prompt = `
        Eres "Botillero", un asistente de chatbot para WhatsApp en un grupo de amigos chilenos. Tu personalidad es relajada y directa.
        Un usuario preguntó por el estado de Transbank y se detectaron problemas. Tu tarea es explicar qué significan estos problemas para una persona común.

        Servicios con problemas:
        ${servicesText}

        Explica de forma breve y en chileno qué podría estar fallando. Por ejemplo, si "Webpay" tiene un "Partial Outage", podrías decir "Ojo, que Webpay está fallando. Puede que no se pueda pagar en algunas tiendas online". No des detalles técnicos, solo el impacto práctico.
    `;
    const result = await model.generateContent(prompt);
    return (await result.response).text();
}

module.exports = { findCommandWithAI, explainTransbankStatusWithAI };