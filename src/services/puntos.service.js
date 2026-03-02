// src/services/puntos.service.js
"use strict";

const fs = require('fs');
const path = require('path');

const PUNTOS_FILE = path.join(__dirname, '..', '..', 'database', 'puntos.json');

// Asegurar que el directorio database existe
const dbDir = path.dirname(PUNTOS_FILE);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

function leerPuntos() {
    try {
        if (!fs.existsSync(PUNTOS_FILE)) {
            return {};
        }
        const data = fs.readFileSync(PUNTOS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error leyendo puntos:', error);
        return {};
    }
}

function guardarPuntos(puntosData) {
    try {
        fs.writeFileSync(PUNTOS_FILE, JSON.stringify(puntosData, null, 2), 'utf8');
    } catch (error) {
        console.error('Error guardando puntos:', error);
    }
}

function obtenerPuntos(userId) {
    const puntosData = leerPuntos();
    return puntosData[userId] || { puntos: 0, nombre: 'Usuario' };
}

function agregarPuntos(userId, userName, cantidad) {
    const puntosData = leerPuntos();
    
    if (!puntosData[userId]) {
        puntosData[userId] = { puntos: 0, nombre: userName };
    }
    
    puntosData[userId].puntos += cantidad;
    puntosData[userId].nombre = userName;
    
    guardarPuntos(puntosData);
    return puntosData[userId].puntos;
}

function obtenerRanking(limit = 10) {
    const puntosData = leerPuntos();
    const ranking = Object.entries(puntosData)
        .map(([userId, data]) => ({
            userId,
            nombre: data.nombre,
            puntos: data.puntos
        }))
        .sort((a, b) => b.puntos - a.puntos)
        .slice(0, limit);
    
    return ranking;
}

module.exports = {
    leerPuntos,
    guardarPuntos,
    obtenerPuntos,
    agregarPuntos,
    obtenerRanking
};
