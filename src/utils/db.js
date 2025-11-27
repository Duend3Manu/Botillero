// src/utils/db.js
"use strict";

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./messages.db', (err) => {
    if (err) {
        console.error("Error al abrir la base de datos", err.message);
    } else {
        console.log("Conectado a la base de datos de mensajes.");
    }
});

// Crear la tabla si no existe
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, body TEXT, timestamp INTEGER)");
    // Crear índice en timestamp para búsquedas más rápidas
    db.run("CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp)");
});

function storeMessage(id, body) {
    const timestamp = Date.now();
    db.run("INSERT OR REPLACE INTO messages (id, body, timestamp) VALUES (?, ?, ?)", [id, body, timestamp], (err) => {
        if (err) {
            console.error("Error al almacenar el mensaje:", err);
        }
    });
}

function getOriginalMessage(id) {
    return new Promise((resolve, reject) => {
        db.get("SELECT body FROM messages WHERE id = ?", [id], (err, row) => {
            if (err) {
                return reject(err);
            }
            resolve(row ? row.body : null);
        });
    });
}

// Limpiar mensajes con más de 5 minutos de antigüedad
// También limitar cantidad total de mensajes a 1000
function cleanupOldMessages() {
    const expirationTime = Date.now() - (5 * 60 * 1000); // 5 minutos
    
    db.run("DELETE FROM messages WHERE timestamp < ?", [expirationTime], (err) => {
        if (err) console.error("Error al limpiar mensajes antiguos:", err);
    });
    
    // Mantener solo los 1000 mensajes más recientes
    db.run(`DELETE FROM messages WHERE id NOT IN (
        SELECT id FROM messages ORDER BY timestamp DESC LIMIT 1000
    )`, (err) => {
        if (err) console.error("Error al limitar cantidad de mensajes:", err);
    });
}

// Iniciar la limpieza periódica cada 2 minutos (más frecuente para evitar acumulación)
setInterval(cleanupOldMessages, 2 * 60 * 1000);

// Limpieza inicial al inicio
setTimeout(cleanupOldMessages, 10000); // 10 segundos después de iniciar

module.exports = { storeMessage, getOriginalMessage };