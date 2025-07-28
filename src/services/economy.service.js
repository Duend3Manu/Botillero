const pythonService = require('./python.service');

// Asumo que el script se llama 'valores.py'
const SCRIPT_NAME = 'valores.py';

async function getEconomicIndicators() {
  try {
    console.log(`(Servicio Economía) -> Ejecutando ${SCRIPT_NAME}...`);
    const indicators = await pythonService.executeScript(SCRIPT_NAME);
    return `Indicadores Económicos del Día:\n\n${indicators}`;
  } catch (error) {
    console.error("Error en getEconomicIndicators:", error.message);
    return "No pude obtener los indicadores económicos en este momento.";
  }
}

module.exports = {
  getEconomicIndicators,
};