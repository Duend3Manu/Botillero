"use strict";

const { getBencinaData } = require('../../services/external.service');
const messagingService = require('../../services/messaging.service');

module.exports = {
    name: 'bencina',
    aliases: [],
    description: 'Obtiene los precios de la bencina para una comuna específica.',
    
    async execute({ client, message, args }) {
        const comuna = args.join(' ');

        if (!comuna) {
            return message.reply("Debes indicar una comuna. Ejemplo: `!bencina providencia`");
        }

        // 1. Notificar al usuario que el proceso ha comenzado y puede tardar.
        messagingService.sendLoadingMessage(message);
        await message.reply(`Buscando precios para *${comuna}*... ⛽\n\n_El servicio externo a veces es lento, esto podría tardar un momento._`);

        try {
            const bencinaData = await getBencinaData(comuna);
            
            // 2. Analizar la respuesta del servicio.
            // Primero, intentamos ver si es un error en formato JSON.
            try {
                const parsedError = JSON.parse(bencinaData);
                if (parsedError && parsedError.error) {
                    // Si es un error conocido (como el de timeout), damos un mensaje específico.
                    if (parsedError.error.includes("demoró demasiado") || parsedError.error.includes("timed out")) {
                        return message.reply("Lo siento, el servicio de Bencina en Línea está muy lento y no respondió a tiempo. Por favor, intenta de nuevo en unos minutos. 😕");
                    }
                    // Para otros errores técnicos, un mensaje más general.
                    return message.reply(`Hubo un problema al consultar el servicio de bencinas: ${parsedError.error}`);
                }
            } catch (e) {
                // Si no era un JSON, significa que es la respuesta correcta (el texto con los precios).
                // Procedemos a enviarla normalmente.
                await client.sendMessage(message.from, bencinaData);
            }

        } catch (error) {
            console.error('Error crítico en el comando !bencina:', error);
            await message.reply('❌ Ocurrió un error inesperado al procesar tu solicitud de bencina.');
        }
    }
};

