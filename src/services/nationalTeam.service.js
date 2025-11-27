const pythonService = require('./python.service');

async function getQualifiersTable() {
  try {
    console.log(`(Servicio Selección) -> Ejecutando tclasi.py...`);
    const result = await pythonService.executeScript('tclasi.py');
    if (result.code !== 0) {
      throw new Error(result.stderr || 'Error al ejecutar tclasi.py');
    }
    return `🇨🇱 Tabla de Clasificatorias 🇨🇱\n\n${result.stdout}`;
  } catch (error) {
    console.error("Error en getQualifiersTable:", error.message);
    return "No pude obtener la tabla de clasificatorias.";
  }
}

async function getQualifiersMatches() {
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
    return `🇨🇱 Próximos Partidos - Clasificatorias 🇨🇱\n\n${result.stdout}`;
  } catch (error) {
    console.error("Error en getQualifiersMatches:", error.message);
    return "No pude obtener los partidos de clasificatorias.";
  }
}

module.exports = {
  getQualifiersTable,
  getQualifiersMatches,
};