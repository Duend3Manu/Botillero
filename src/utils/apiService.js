// src/utils/apiService.js
"use strict";

const FormData = require('form-data');
const axios = require('axios');

/**
 * Consulta la información de una patente vehicular.
 * @param {string} patente - La patente a consultar.
 * @returns {Promise<object>} Un objeto con el resultado de la consulta.
 */
async function getPatenteDataFormatted(patente) {
    console.log(`(apiService) -> Buscando patente: ${patente}`);
    const apiUrl = `https://infoflow.cloud/patlite.php?pat=${encodeURIComponent(patente)}`;
    const maxIntentos = 5;
    let apiResponse = null;

    for (let intento = 1; intento <= maxIntentos; intento++) {
        try {
            const response = await axios.get(apiUrl, {
                headers: { 'User-Agent': 'BotilleroBot/1.0' },
                timeout: 10000,
            });

            if (response.status === 200 && response.data && JSON.stringify(response.data).length > 10) {
                apiResponse = response.data;
                break;
            } else {
                console.warn(`(apiService) Intento ${intento}: respuesta vacía o corta para patente ${patente}. Status: ${response.status}`);
            }
        } catch (error) {
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                console.error(`(apiService) Intento ${intento}: TIMEOUT para patente ${patente}`);
            } else if (error.response) {
                console.error(`(apiService) Intento ${intento}: Error HTTP ${error.response.status} para patente ${patente}`);
            } else {
                console.error(`(apiService) Intento ${intento}: Error de red para patente ${patente} → ${error.message}`);
            }
        }
        if (intento < maxIntentos) await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!apiResponse) {
        return { error: true, message: `😕 Lo siento, el sistema está con alta demanda y no pude obtener los datos de la patente.\nPor favor, intenta nuevamente en unos minutos.` };
    }

    // Validar que la estructura de la respuesta sea la esperada
    if (apiResponse.valido === true && apiResponse.info && typeof apiResponse.info.Respuesta === 'object' && apiResponse.info.Respuesta !== null) {
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
        // Loguear la respuesta real para facilitar el diagnóstico
        const mensajeApi = apiResponse.mensaje || apiResponse.message || '';
        console.warn(`(apiService) Respuesta no válida para patente ${patente}. valido=${apiResponse.valido}, mensaje API: "${mensajeApi}", estructura:`, JSON.stringify(apiResponse).substring(0, 300));

        const errorMsg = `🚨 *Patente inválida o no encontrada*

La patente *${patente}* no fue encontrada en el sistema.${mensajeApi ? `\n_Detalle: ${mensajeApi}_` : ''}

🏍️ Si es una moto, agrega un '0' después de las letras. Ejemplo: \`AB0123\`.
🚗 Para vehículos, la patente debe tener 6 caracteres (letras y números). Ejemplo: \`ABC123\`.`;
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

/**
 * Consulta la información de un número de teléfono.
 * @param {string} phoneNumber - El número a consultar.
 * @returns {Promise<object>} Un objeto con el resultado de la consulta.
 */
async function getPhoneData(phoneNumber) {
    console.log(`(apiService) -> Buscando número: ${phoneNumber}`);
    const apiUrl = 'https://celuzador.porsilapongo.cl/celuzadorApi.php';
    const formData = new FormData();
    formData.append('tlfWA', phoneNumber);

    try {
        const response = await axios.post(apiUrl, formData, {
            headers: {
                ...formData.getHeaders(),
                'User-Agent': 'CeludeitorAPI-TuCulitoSacaLlamaAUFAUF',
            },
        });

        if (response.data.estado === 'correcto') {
            const responseData = response.data.data;
            const imageUrlMatch = responseData.match(/\*Link Foto\* : (https?:\/\/[^\s]+)/);
            const imageUrl = imageUrlMatch ? imageUrlMatch[1] : null;
            return { error: false, data: `ℹ️ *Información del número:*\n${responseData}`, imageUrl };
        } else {
            return { error: true, message: response.data.data };
        }
    } catch (error) {
        console.error("Error en getPhoneData:", error.message);
        return { error: true, message: '⚠️ Hubo un error al consultar el servicio de búsqueda. Intenta más tarde.' };
    }
}

module.exports = {
    getPatenteDataFormatted,
    getRutData,
    getPhoneData
};