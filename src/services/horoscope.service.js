// src/services/horoscope.service.js
"use strict";

const path = require('path');
const fs = require('fs');
const pythonService = require('./python.service');

const signosZodiacales = ['aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo', 'libra', 'escorpion', 'sagitario', 'capricornio', 'acuario', 'piscis'];
const signosChinos = ['rata', 'buey', 'tigre', 'conejo', 'dragon', 'serpiente', 'caballo', 'cabra', 'mono', 'gallo', 'perro', 'cerdo'];

function limpiarSigno(signo) {
  if (!signo) return '';
  return signo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function findImagePath(signo) {
    const signoLimpio = limpiarSigno(signo);
    // RUTA CORREGIDA: Ahora es relativa al proyecto, no depende de C:\
    const imageDir = path.join(__dirname, '..', '..', 'signos');
    
    const extensions = ['.jpg', '.jpeg', '.png', '.webp'];

    for (const ext of extensions) {
        const imagePath = path.join(imageDir, `${signoLimpio}${ext}`);
        if (fs.existsSync(imagePath)) {
            return imagePath;
        }
    }
    
    console.warn(`No se encontró imagen para el signo: ${signo}`);
    return null;
}

async function getHoroscope(signo) {
    const signoLimpio = limpiarSigno(signo);
    let scriptName = '';

    if (signosZodiacales.includes(signoLimpio)) {
        scriptName = 'horoscopo.py';
    } else if (signosChinos.includes(signoLimpio)) {
        scriptName = 'horoscopoc.py';
    } else {
        return { text: 'Por favor, proporciona un signo zodiacal o chino válido.', imagePath: null };
    }

    try {
        console.log(`(Servicio Horóscopo) -> Ejecutando ${scriptName} para el signo ${signoLimpio}...`);
        const horoscopeData = await pythonService.executeScript(scriptName, [signoLimpio]);
        const imagePath = findImagePath(signoLimpio);
        
        return { text: horoscopeData, imagePath: imagePath };

    } catch (error) {
        console.error(`Error en getHoroscope para ${signo}:`, error.message);
        return { text: 'No pude obtener el horóscopo en este momento.', imagePath: null };
    }
}

module.exports = {
    getHoroscope
};