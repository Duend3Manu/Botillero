const pythonService = require('./python.service');

const SCRIPT_NAME = 'valores.py';

// Variables para caché (evita ejecutar Python innecesariamente)
let cachedData = null;
let lastUpdate = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hora de validez

async function getEconomicIndicators() {
  // 1. Si tenemos datos recientes en memoria, los usamos
  if (cachedData && (Date.now() - lastUpdate < CACHE_TTL)) {
      return cachedData;
  }

  try {
    console.log(`(Servicio Economía) -> Ejecutando ${SCRIPT_NAME}...`);
    const result = await pythonService.executeScript(SCRIPT_NAME);
    
    if (result.code !== 0) {
        throw new Error(result.stderr || 'Error desconocido en script Python');
    }
    
    // 2. Guardamos en caché y retornamos
    const response = `💰 *Indicadores Económicos del Día* 💰\n\n${result.stdout.trim()}`;
    cachedData = response;
    lastUpdate = Date.now();
    
    return response;
  } catch (error) {
    console.error("Error en getEconomicIndicators:", error.message);
    
    // 3. Fallback: Si falla el script pero tenemos caché antigua, la mostramos con una advertencia
    if (cachedData) {
        return `${cachedData}\n\n_(⚠️ No pude actualizar los datos recientes, mostrando último registro)_`;
    }
    
    return "No pude obtener los indicadores económicos en este momento.";
  }
}

module.exports = {
  getEconomicIndicators,
};