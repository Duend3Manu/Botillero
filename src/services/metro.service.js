const pythonService = require('./python.service');

// Script Python mejorado con caché, mejor manejo de errores y timeouts optimizados
const METRO_SCRIPT_NAME = 'metro.py';

async function getMetroStatus() {
  try {
    console.log(`(Servicio Metro) -> Ejecutando ${METRO_SCRIPT_NAME}...`);
    
    // Llamar al servicio Python y obtener la respuesta completa
    const result = await pythonService.executeScript(METRO_SCRIPT_NAME);
    
    // El script ahora devuelve exitosamente (code 0) o falla (code 1)
    if (result.code !== 0) {
      console.error(`Error al ejecutar metro.py: ${result.stderr}`);
      return "⚠️ No pude obtener el estado del metro en este momento.";
    }
    
    // El script ya devuelve el texto formateado perfectamente para WhatsApp
    // (incluye título, emojis, y toda la info), así que solo lo retornamos
    return result.stdout;

  } catch (error) {
    console.error("Error en el servicio de Metro:", error.message);
    return "⚠️ No pude obtener el estado del metro en este momento.";
  }
}

module.exports = { getMetroStatus };