// src/utils/db.js (VERSIÓN CON better-sqlite3)
"use strict";

const path = require('path');
const Database = require('better-sqlite3');  // CAMBIO: mejor-sqlite3 en lugar de sqlite3
const DB_PATH = path.join(__dirname, '../../messages.db');

// CAMBIO: Conexión simplificada - better-sqlite3 no necesita callback inicial
const db = new Database(DB_PATH);
console.log("Conectado a la base de datos de mensajes con better-sqlite3.");

// Activar modo WAL para mejor rendimiento y concurrencia
db.pragma('journal_mode = WAL');

// Crear la tabla si no existe (CAMBIO: mejor-sqlite3 usa prepare/run)
db.prepare("CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, body TEXT, timestamp INTEGER)").run();
// Crear índice en timestamp para búsquedas más rápidas
db.prepare("CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp)").run();

// Preparar statements para mejor rendimiento (CAMBIO: prepared statements)
const insertStmt = db.prepare("INSERT OR REPLACE INTO messages (id, body, timestamp) VALUES (?, ?, ?)");
const selectStmt = db.prepare("SELECT body FROM messages WHERE id = ?");

function storeMessage(id, body) {
    const timestamp = Date.now();
    try {
        insertStmt.run(id, body, timestamp);
    } catch (err) {
        console.error("Error al almacenar el mensaje:", err);
    }
}

function getOriginalMessage(id) {
    try {
        const row = selectStmt.get(id);
        return row ? row.body : null;
    } catch (err) {
        console.error("Error al obtener mensaje:", err);
        return null;
    }
}

// Limpiar mensajes con más de 5 minutos de antigüedad
// También limitar cantidad total de mensajes a 1000
function cleanupOldMessages() {
    const expirationTime = Date.now() - (5 * 60 * 1000); // 5 minutos
    
    try {
        db.prepare("DELETE FROM messages WHERE timestamp < ?").run(expirationTime);
    } catch (err) {
        console.error("Error al limpiar mensajes antiguos:", err);
    }
    
    // Mantener solo los 1000 mensajes más recientes
    try {
        db.prepare(`DELETE FROM messages WHERE id NOT IN (
            SELECT id FROM messages ORDER BY timestamp DESC LIMIT 1000
        )`).run();
    } catch (err) {
        console.error("Error al limitar cantidad de mensajes:", err);
    }
}

// Iniciar la limpieza periódica cada 2 minutos (más frecuente para evitar acumulación)
setInterval(cleanupOldMessages, 2 * 60 * 1000);

// Limpieza inicial al inicio
setTimeout(cleanupOldMessages, 10000); // 10 segundos después de iniciar

// Manejo de cierre seguro para evitar corrupción de datos
process.on('SIGINT', () => {
    try {
        db.close();
        console.log('Base de datos cerrada correctamente.');
    } catch (err) {
        console.error('Error al cerrar la base de datos:', err.message);
    }
    process.exit(0);
});

module.exports = { storeMessage, getOriginalMessage };