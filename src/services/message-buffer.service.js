// src/services/message-buffer.service.js
"use strict";

/**
 * Servicio para almacenar los últimos N mensajes de cada grupo
 * Implementa buffer circular FIFO (First In, First Out)
 */

const MAX_MESSAGES_PER_GROUP = 20;

// Map<groupId, Array<MessageData>>
const groupBuffers = new Map();

/**
 * Agrega un mensaje al buffer del grupo
 * Si el buffer supera MAX_MESSAGES_PER_GROUP, elimina el más antiguo
 * @param {string} groupId - ID del grupo
 * @param {Object} messageData - Datos del mensaje
 */
function addMessage(groupId, messageData) {
    if (!groupBuffers.has(groupId)) {
        groupBuffers.set(groupId, []);
    }
    
    const buffer = groupBuffers.get(groupId);
    
    // Agregar mensaje al final
    buffer.push(messageData);
    
    // Si supera el límite, eliminar el más antiguo (FIFO)
    if (buffer.length > MAX_MESSAGES_PER_GROUP) {
        buffer.shift(); // Elimina el primero (más antiguo)
    }
    
    console.log(`(Buffer) -> Grupo ${groupId.slice(0, 15)}...: ${buffer.length}/${MAX_MESSAGES_PER_GROUP} mensajes`);
}

/**
 * Obtiene los mensajes del buffer de un grupo
 * @param {string} groupId - ID del grupo
 * @returns {Array} Array de mensajes
 */
function getMessages(groupId) {
    if (!groupBuffers.has(groupId)) {
        return [];
    }
    
    return groupBuffers.get(groupId);
}

/**
 * Limpia el buffer de un grupo
 * @param {string} groupId - ID del grupo
 */
function clearBuffer(groupId) {
    groupBuffers.delete(groupId);
    console.log(`(Buffer) -> Buffer del grupo ${groupId.slice(0, 15)}... limpiado`);
}

/**
 * Obtiene estadísticas del buffer
 * @returns {Object} Estadísticas
 */
function getStats() {
    const stats = {
        totalGroups: groupBuffers.size,
        groups: []
    };
    
    for (const [groupId, buffer] of groupBuffers.entries()) {
        stats.groups.push({
            groupId: groupId.slice(0, 15) + '...',
            messageCount: buffer.length
        });
    }
    
    return stats;
}

module.exports = {
    addMessage,
    getMessages,
    clearBuffer,
    getStats,
    MAX_MESSAGES_PER_GROUP
};
