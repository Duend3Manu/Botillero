// src/services/ai.service.js
"use strict";

const { GoogleGenerativeAI } = require("@google/generative-ai");

// La API Key se carga desde el archivo .env gracias a la configuración en index.js
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Constante para el modelo (fácil de actualizar en el futuro)
const MODEL_NAME = "gemini-2.5-flash";  // Gemini 2.5 Flash (más reciente)
const getModel = () => genAI.getGenerativeModel({ model: MODEL_NAME });

// Lista de comandos para que la IA los conozca y pueda recomendarlos.
const commandList = `
!clima [ciudad], !valores, !feriados, !far [comuna], !metro, !sismos, !bus [paradero], !sec, !secrm, !trstatus,
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

    const model = getModel();

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

    const model = getModel();
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

/**
 * Genera un resumen de texto usando IA.
 */
async function generateSummary(text) {
    const model = getModel();
    const prompt = `Resume el siguiente texto en español, sé conciso y destaca lo importante:\n\n${text}`;
    const result = await model.generateContent(prompt);
    return (await result.response).text();
}

/**
 * Usa la IA para responder sobre feriados basándose en una lista oficial.
 */
async function getFeriadosResponse(userQuery, feriadosData) {
    if (!process.env.GEMINI_API_KEY) return "No tengo cerebro (API Key) para procesar esto.";

    const model = getModel();
    const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `
    Actúa como 'Botillero', un asistente chileno experto en calendario.
    Hoy es: ${today}.
    
    El usuario consulta: "${userQuery || 'cuales son los proximos feriados'}"

    Aquí tienes la base de datos OFICIAL de feriados de Chile (JSON):
    ${JSON.stringify(feriadosData)}

    Instrucciones:
    1. Analiza la fecha o mes que pide el usuario (si no dice nada, asume que es desde hoy en adelante).
    2. Filtra y selecciona los PRÓXIMOS 5 feriados que coincidan con su búsqueda.
    3. Genera una respuesta con este formato exacto para cada uno:
       "🗓️ *[Día Semana] [Día] de [Mes]*: [Nombre Feriado] - _[Renunciable/Irrenunciable]_"
    4. IMPORTANTE: En los datos, "irrenunciable": "1" significa que ES Irrenunciable. Si es "0", es Renunciable.
    5. Sé amable y usa modismos chilenos sutiles.
    `;

    const result = await model.generateContent(prompt);
    return (await result.response).text();
}

/**
 * Genera un resumen de una conversación de grupo usando IA.
 * @param {Array} messages - Array de objetos { user, message, timestamp }
 * @returns {Promise<string>} - Resumen generado por la IA
 */
async function generateConversationSummary(messages) {
    if (!process.env.GEMINI_API_KEY) {
        return "No tengo cerebro (API Key) para hacer resúmenes.";
    }

    const model = getModel();
    
    // Formatear conversación
    const conversationText = messages.map(m => {
        const time = new Date(m.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        return `[${time}] ${m.user}: ${m.message}`;
    }).join('\n');
    
    const prompt = `
    Eres "Botillero", un asistente chileno que resume conversaciones de WhatsApp.
    
    Conversación del grupo (${messages.length} mensajes):
    ${conversationText}
    
    Genera un resumen casual y en chileno que incluya:
    - 📌 Los 2-3 temas principales que se discutieron
    - 👥 Quién dijo qué (menciona a las personas por nombre)
    - 💡 Conclusiones, acuerdos o cosas pendientes (si hay)
    - 😂 Si hubo algo chistoso, menciónalo
    
    Reglas:
    - Usa lenguaje casual chileno ("wena", "cachai", "al tiro", etc.)
    - Máximo 250 palabras
    - No inventes información que no está en la conversación
    - Si la conversación es muy corta o poco relevante, di "No hay mucho que resumir, puros saludos nomás"
    `;
    
    const result = await model.generateContent(prompt);
    return (await result.response).text();
}

module.exports = { findCommandWithAI, explainTransbankStatusWithAI, generateSummary, getFeriadosResponse, generateConversationSummary };