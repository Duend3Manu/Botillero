const pythonService = require('./python.service');

// Asumo que el script se llama 'valores.py'
const SCRIPT_NAME = 'valores.py';

async function getEconomicIndicators() {
  try {
    console.log(`(Servicio Economía) -> Ejecutando ${SCRIPT_NAME}...`);
    const result = await pythonService.executeScript(SCRIPT_NAME);
    if (result.code !== 0) {
        throw new Error(result.stderr || 'Error desconocido en script Python');
    }
    return `Indicadores Económicos del Día:\n\n${result.stdout}`;
  } catch (error) {
    console.error("Error en getEconomicIndicators:", error.message);
    return "No pude obtener los indicadores económicos en este momento.";
  }
}

module.exports = {
  getEconomicIndicators,
};