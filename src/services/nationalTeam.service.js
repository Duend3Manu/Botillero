const pythonService = require('./python.service');

async function getQualifiersTable() {
  try {
    console.log(`(Servicio Selección) -> Ejecutando tclasi.py...`);
    const { stdout: tableData } = await pythonService.executePythonScript('tclasi.py');
    return `🇨🇱 Tabla de Clasificatorias 🇨🇱\n\n${tableData}`;
  } catch (error) {
    console.error("Error en getQualifiersTable:", error.message);
    return "No pude obtener la tabla de clasificatorias.";
  }
}

async function getQualifiersMatches() {
  try {
    console.log(`(Servicio Selección) -> Ejecutando clasi.py...`);
    const { stdout: matchesData } = await pythonService.executePythonScript('clasi.py');
    // Verificamos si la respuesta está vacía, como en tu prueba anterior.
    if (!matchesData || matchesData.trim() === '') {
        return "Actualmente no hay información de próximos partidos de clasificatorias.";
    }
    return `🇨🇱 Próximos Partidos - Clasificatorias 🇨🇱\n\n${matchesData}`;
  } catch (error) {
    console.error("Error en getQualifiersMatches:", error.message);
    return "No pude obtener los partidos de clasificatorias.";
  }
}

module.exports = {
  getQualifiersTable,
  getQualifiersMatches,
};