// src/utils/apiService.js
"use strict";

const axios = require('axios');

/**
 * Consulta la información de una patente vehicular.
 * @param {string} patente - La patente a consultar.
 * @returns {Promise<object>} Un objeto con el resultado de la consulta.
 */
async function getPatenteDataFormatted(patente) {
    console.log(`(apiService) -> Buscando patente real: ${patente}`);
    const apiUrl = `https://infoflow.cloud/patlite.php?pat=${encodeURIComponent(patente)}`;
    const maxIntentos = 5;
    let apiResponse = null;

    for (let intento = 1; intento <= maxIntentos; intento++) {
        try {
            const response = await axios.get(apiUrl, {
                headers: { 'User-Agent': 'tuCulitoSacallama-SV' }, // Usando el User-Agent de tu script original
                timeout: 10000,
            });

            if (response.status === 200 && response.data && JSON.stringify(response.data).length > 10) {
                apiResponse = response.data;
                break; // Si tenemos respuesta, salimos del bucle
            }
        } catch (error) {
            console.error(`Intento ${intento} fallido para patente ${patente}: ${error.message}`);
        }
        if (intento < maxIntentos) await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!apiResponse) {
        return { error: true, message: `😕 Lo siento, el sistema está con alta demanda y no pude obtener los datos de la patente.\nPor favor, intenta nuevamente en unos minutos.` };
    }

    if (apiResponse.valido === true && apiResponse.info?.Respuesta) {
        const info = apiResponse.info.Respuesta;
        const formatear = (valor, fallback = 'No disponible') => (valor && String(valor).trim() !== '') ? String(valor).trim() : fallback;

        const mensaje = 
`🚗 *Información de la Patente*
🔍 *Patente:* ${formatear(info.plate, patente.toUpperCase())}
🚙 *Marca:* ${formatear(info.brand)}
🔧 *Modelo:* ${formatear(info.model)}
📅 *Año:* ${formatear(info.year)}
🎨 *Color:* ${formatear(info.color)}
🔩 *Nro. Motor:* ${formatear(info.engine)}
🔖 *Chassis:* ${formatear(info.chassis)}
🔧 *Tipo:* ${formatear(info.typeDescription)}
👤 *Nombre:* ${formatear(info.name?.replace(/\s+/g, ' '))}
🪪 *RUT:* ${formatear(info.numberOfIdentification && info.verifierDigit ? `${info.numberOfIdentification}-${info.verifierDigit}` : '')}
📍 *Dirección:* ${formatear(info.DIRECCION)}`;

        return { error: false, data: mensaje };
    } else {
        const errorMsg = `🚨 *Patente inválida*

La patente ingresada es *inválida* según el sistema, por favor revisa que esté bien escrita (6 caracteres, solo letras y números).

🏍️ Si es una moto, agrega un '0' después de las letras. Ejemplo: \`AB0123\`.
🚗 Para vehículos, la patente debe tener 6 caracteres, letras y números. Ejemplo: \`ABC123\`.`;
        return { error: true, message: errorMsg };
    }
}

/**
 * Consulta la información de una TNE a partir de un RUT.
 * @param {string} rut - El RUT a consultar.
 * @returns {Promise<object>} Un objeto con el resultado de la consulta.
 */
async function getRutData(rut) {
    console.log(`(apiService) -> Buscando RUT TNE: ${rut}`);
    // Aquí iría la lógica real de tu función getRutData del Index.js original.
    // Como no la tengo completa, mantengo la simulación.
    if (rut.startsWith('1')) {
         return { 
            error: false, 
            data: {
                primerNombre: 'JUANITO',
                apellidoPaterno: 'PEREZ',
                tneFolio: '123456789',
                tnePeriodo: '2025',
                tneTipo: 'EDUCACION SUPERIOR',
                tneEstado: 'HABILITADA',
                soliFech: '2025-01-15',
                soliEstado: 'DESPACHADA',
                observaciones: 'Ninguna'
            }
        };
    } else {
        return { error: true, message: "No se encontró información para el RUT proporcionado." };
    }
}

module.exports = {
    getPatenteDataFormatted,
    getRutData
};