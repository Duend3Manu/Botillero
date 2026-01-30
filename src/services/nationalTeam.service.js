const pythonService = require('./python.service');

// Variables para caché (evita ejecutar Python innecesariamente)
let tableCache = null;
let lastTableUpdate = 0;
let matchesCache = null;
let lastMatchesUpdate = 0;

const TABLE_CACHE_TTL = 60 * 1000; // 1 minuto: La tabla cambia en vivo si hay goles
const MATCHES_CACHE_TTL = 60 * 60 * 1000; // 1 hora: El calendario es estable

async function getQualifiersTable() {
  // 1. Revisar caché
  if (tableCache && (Date.now() - lastTableUpdate < TABLE_CACHE_TTL)) {
      return tableCache;
  }

  try {
    console.log(`(Servicio Selección) -> Ejecutando tclasi.py...`);
    const result = await pythonService.executeScript('tclasi.py');
    if (result.code !== 0) {
      throw new Error(result.stderr || 'Error al ejecutar tclasi.py');
    }
    
    const response = `🇨🇱 Tabla de Clasificatorias 🇨🇱\n\n${result.stdout}`;
    tableCache = response;
    lastTableUpdate = Date.now();
    
    return response;
  } catch (error) {
    console.error("Error en getQualifiersTable:", error.message);
    if (tableCache) return `${tableCache}\n\n_(⚠️ Datos antiguos, error al actualizar)_`;
    return "No pude obtener la tabla de clasificatorias.";
  }
}

async function getQualifiersMatches() {
  // 1. Revisar caché
  if (matchesCache && (Date.now() - lastMatchesUpdate < MATCHES_CACHE_TTL)) {
      return matchesCache;
  }

  try {
    console.log(`(Servicio Selección) -> Ejecutando clasi.py...`);
    const result = await pythonService.executeScript('clasi.py');
    if (result.code !== 0) {
      throw new Error(result.stderr || 'Error al ejecutar clasi.py');
    }
    // Verificamos si la respuesta está vacía, como en tu prueba anterior.
    if (!result.stdout || result.stdout.trim() === '') {
        return "Actualmente no hay información de próximos partidos de clasificatorias.";
    }
    
    const response = `🇨🇱 Próximos Partidos - Clasificatorias 🇨🇱\n\n${result.stdout}`;
    matchesCache = response;
    lastMatchesUpdate = Date.now();
    
    return response;
  } catch (error) {
    console.error("Error en getQualifiersMatches:", error.message);
    if (matchesCache) return `${matchesCache}\n\n_(⚠️ Datos antiguos, error al actualizar)_`;
    return "No pude obtener los partidos de clasificatorias.";
  }
}

module.exports = {
  getQualifiersTable,
  getQualifiersMatches,
};