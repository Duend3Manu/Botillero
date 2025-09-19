"use strict";

const fs = require('fs');
const bannerService = require('../services/banner.service');

/**
 * --- ¡NUEVO Y ADAPTADO! ---
 * Maneja la creación de banners con diferentes estilos.
 * @param {object} message - El objeto de mensaje adaptado y universal.
 */
async function handleBanner(message) {
    const args = message.args;
    
    const availableStyles = [
        'vengadores', 'shrek', 'mario', 'nintendo', 'sega', 
        'potter', 'starwars', 'disney', 'stranger', 'cocacola', 'pixel'
    ];

    if (args.length < 2) {
        let helpMessage = "*Formato incorrecto.* Debes usar: `!banner <estilo> <texto>`\n\n";
        helpMessage += "*Estilos disponibles:*\n";
        helpMessage += `\`${availableStyles.join('`, `')}\`\n\n`;
        helpMessage += "*Ejemplo:*\n`!banner vengadores Hola a todos`";
        return message.reply(helpMessage);
    }

    const style = args[0].toLowerCase();
    const text = args.slice(1).join(' ');

    if (!availableStyles.includes(style)) {
        return message.reply(`El estilo "${style}" no es válido. Los estilos disponibles son: \`${availableStyles.join(', ')}\``);
    }

    let bannerPath;
    try {
        // Notificamos al usuario que estamos trabajando
        await message.react('⏳');
        await message.reply(`Creando tu banner estilo *${style}*... ✨`);
        
        // Llamamos al servicio que genera la imagen
        bannerPath = await bannerService.createBanner(style, text);
        
        // Enviamos la imagen usando la función de nuestro adaptador
        await message.sendImage(bannerPath, `¡Aquí está tu banner, ${message.senderName}!`);

    } catch (error) {
        console.error("Error en handleBanner:", error);
        message.reply(`Hubo un error al crear tu banner: ${error.message}`);
    } finally {
        // --- ¡IMPORTANTE! ---
        // Limpiamos el archivo temporal después de enviarlo para no llenar el disco.
        if (bannerPath && fs.existsSync(bannerPath)) {
            fs.unlinkSync(bannerPath);
        }
    }
}

module.exports = {
    handleBanner
};
