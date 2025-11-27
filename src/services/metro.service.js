/**
 * Servicio mejorado de Metro con análisis inteligente
 * Usa IA para sugerir rutas alternativas cuando hay problemas
 */
"use strict";

const pythonService = require('./python.service');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rateLimiter = require('./rate-limiter.service');

const METRO_SCRIPT_NAME = 'metro.py';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Obtiene el estado bruto del metro desde el script Python
 */
async function getMetroStatusRaw() {
    try {
        console.log(`(Servicio Metro) -> Ejecutando ${METRO_SCRIPT_NAME}...`);
        const result = await pythonService.executeScript(METRO_SCRIPT_NAME);
        
        if (result.code !== 0) {
            console.error(`Error al ejecutar metro.py: ${result.stderr}`);
            return null;
        }
        
        return result.stdout;
    } catch (error) {
        console.error("Error en el servicio de Metro:", error.message);
        return null;
    }
}

/**
 * Genera recomendaciones inteligentes basadas en el estado del metro
 */
async function generateMetroAdvice(metroStatus) {
    if (!process.env.GEMINI_API_KEY) {
        return null;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

        const prompt = `
Eres "Botillero", un asistente inteligente de Metro. Analiza el siguiente estado del Metro de Santiago y da CONSEJO CORTO y PRÁCTICO.

Estado actual del Metro:
${metroStatus}

Tu tarea:
1. Si TODO está normal: Responde "✅ Metro operando normal, compa."
2. Si hay PROBLEMAS: Identifica qué líneas están fallando
3. Da UNA alternativa de ruta rápida (máximo 1-2 líneas de recomendación)
4. Usa lenguaje coloquial chileno
5. Responde SOLO el consejo, sin explicaciones adicionales
6. Máximo 2 líneas

Ejemplo de respuesta:
"⚠️ Línea 1 con delays. Usa L4 hacia Mapocho, luego L2 a Puente Cal y Canto."
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error al generar consejo del metro:', error.message);
        return null;
    }
}

/**
 * Función principal mejorada de Metro
 */
async function getMetroStatus() {
    try {
        // Primero obtener el estado bruto
        const metroStatus = await getMetroStatusRaw();
        
        if (!metroStatus) {
            return "⚠️ No pude obtener el estado del metro en este momento.";
        }

        let response = metroStatus;

        // Si hay problemas detectados y no estamos en cooldown, agregar análisis con IA
        if (metroStatus.toLowerCase().includes('problema') || 
            metroStatus.toLowerCase().includes('delay') || 
            metroStatus.toLowerCase().includes('suspendido') ||
            metroStatus.toLowerCase().includes('cierre')) {
            
            const cooldown = rateLimiter.checkCooldown();
            if (cooldown.canMakeRequest && process.env.GEMINI_API_KEY) {
                try {
                    const advice = await generateMetroAdvice(metroStatus);
                    if (advice) {
                        rateLimiter.updateLastRequest();
                        response += `\n\n💡 *Consejo:* ${advice}`;
                    }
                } catch (error) {
                    console.error('Error al generar consejo (no crítico):', error.message);
                    // Continuar sin consejo, no es crítico
                }
            }
        }

        return response;
    } catch (error) {
        console.error("Error en getMetroStatus:", error.message);
        return "⚠️ No pude obtener el estado del metro en este momento.";
    }
}

module.exports = { getMetroStatus };