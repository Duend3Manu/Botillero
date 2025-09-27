const pythonService = require('./python.service');

// IMPORTANTE: Asegúrate de que el script de Python se llame 'metro.py'
// y esté dentro de la carpeta 'scripts/python/'.
const METRO_SCRIPT_NAME = 'metro.py'; 

async function getMetroStatus() {
  try {
    console.log(`(Servicio Metro) -> Llamando a python.service para ejecutar ${METRO_SCRIPT_NAME}...`);
    
    // 1. Llama a nuestro servicio central de Python
    const status = await pythonService.executeScript(METRO_SCRIPT_NAME);
    
    // 2. Formatea la respuesta
    return `Estado del Metro:\n${status}`;

  } catch (error) {
    console.error("Error en el servicio de Metro:", error.message);
    return "Lo siento, no pude obtener el estado del metro en este momento.";
  }
}

module.exports = { getMetroStatus };