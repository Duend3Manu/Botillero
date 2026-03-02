// src/handlers/callback.handler.js
"use strict";

/**
 * Handler para procesar callback_query de botones inline
 */

const {
    getMainMenuKeyboard,
    getServiciosMenuKeyboard,
    getBusquedasMenuKeyboard,
    getFutbolMenuKeyboard,
    getDiversionMenuKeyboard,
    getGestionMenuKeyboard,
    getRedMenuKeyboard,
    commandInfo
} = require('./menu.handler');

/**
 * Procesa los callbacks de los botones del menú
 * @param {TelegramBot} bot - Instancia del bot de Telegram
 * @param {Object} callbackQuery - Objeto callback_query de Telegram
 */
async function handleCallback(bot, callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;

    console.log(`📱 Callback recibido: ${data}`);

    try {
        // Responder al callback para quitar el "loading" del botón
        await bot.answerCallbackQuery(callbackQuery.id);

        // Menú principal
        if (data === 'menu_main') {
            await bot.editMessageText(
                '🤖 *Menú Principal - Botillero*\n\nSelecciona una categoría:',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: getMainMenuKeyboard()
                }
            );
            return;
        }

        // Categorías del menú
        const categoryMap = {
            'cat_servicios': {
                text: '🛠️ *Servicios*\n\nComandos de servicios públicos y utilidades:',
                keyboard: getServiciosMenuKeyboard()
            },
            'cat_busquedas': {
                text: '🔍 *Búsquedas*\n\nComandos de búsqueda y consultas:',
                keyboard: getBusquedasMenuKeyboard()
            },
            'cat_futbol': {
                text: '⚽ *Fútbol*\n\nComandos relacionados con fútbol:',
                keyboard: getFutbolMenuKeyboard()
            },
            'cat_diversion': {
                text: '🎉 *Diversión*\n\nComandos de entretenimiento:',
                keyboard: getDiversionMenuKeyboard()
            },
            'cat_gestion': {
                text: '📋 *Gestión*\n\nComandos de administración:',
                keyboard: getGestionMenuKeyboard()
            },
            'cat_red': {
                text: '📡 *Red*\n\nComandos de consultas de red:',
                keyboard: getRedMenuKeyboard()
            }
        };

        if (categoryMap[data]) {
            await bot.editMessageText(
                categoryMap[data].text,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: categoryMap[data].keyboard
                }
            );
            return;
        }

        // Comandos individuales
        if (data.startsWith('cmd_')) {
            const cmd = data.replace('cmd_', '');
            const info = commandInfo[cmd];

            if (info) {
                await bot.editMessageText(
                    info,
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '⬅️ Volver', callback_data: 'menu_main' }]
                            ]
                        }
                    }
                );
            } else {
                await bot.editMessageText(
                    `❌ No se encontró información para el comando: ${cmd}`,
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '⬅️ Volver', callback_data: 'menu_main' }]
                            ]
                        }
                    }
                );
            }
            return;
        }

        // Todos los comandos
        if (data === 'all_commands') {
            const allCommands = `📚 *Todos los Comandos Disponibles*

🛠️ *Servicios:*
\`!clima [ciudad]\` - Pronóstico del tiempo
\`!valores\` - Indicadores económicos
\`!feriados\` - Próximos feriados
\`!far [comuna]\` - Farmacias de turno
\`!metro\` - Estado del Metro
\`!sismos\` - Últimos sismos
\`!bus [paradero]\` - Llegada de buses
\`!sec\` - Cortes de luz
\`!transbank\` - Estado Transbank
\`!bancos\` - Estado de bancos
\`!ping\` - Estado del bot

🔍 *Búsquedas:*
\`!wiki [término]\` - Wikipedia
\`!g [término]\` - Google
\`!noticias\` - Últimas noticias
\`!pat [patente]\` - Info de vehículo
\`!num [teléfono]\` - Info de número

⚽ *Fútbol:*
\`!tabla\` - Tabla liga chilena
\`!partidos\` - Resumen fecha actual
\`!prox\` - Próximos partidos
\`!clasi\` - Partidos clasificatorias
\`!tclasi\` - Tabla clasificatorias

🎉 *Diversión:*
\`!s\` - Crear sticker
\`!audios\` - Lista de audios
\`!chiste\` - Chiste aleatorio
\`!toimg\` - Sticker a imagen
\`!ruleta\` - Ruleta de premios
\`!puntos\` - Ver tus puntos
\`!ranking\` - Top 10 jugadores
\`!horoscopo [signo]\` - Tu horóscopo
\`!random\` - Dato curioso

📋 *Gestión:*
\`!ticket [texto]\` - Crear ticket
\`!caso [texto]\` - Registrar caso
\`!todos\` - Mencionar a todos
\`!id\` - ID del chat

📡 *Red:*
\`!whois [dominio/IP]\` - Info WHOIS
\`!nic [dominio.cl]\` - Info NIC Chile`;

            await bot.editMessageText(
                allCommands,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⬅️ Volver', callback_data: 'menu_main' }]
                        ]
                    }
                }
            );
            return;
        }

        // Submenú de countdowns
        if (data === 'submenu_countdowns') {
            await bot.editMessageText(
                '⏳ *Countdowns*\n\nComandos de cuenta regresiva:\n\n\`!18\` - Días hasta el 18\n\`!navidad\` - Días hasta Navidad\n\`!añonuevo\` - Días hasta Año Nuevo',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⬅️ Volver', callback_data: 'cat_diversion' }]
                        ]
                    }
                }
            );
            return;
        }

        // --- Pack de stickers ---
        if (data.startsWith('sticker_pack:')) {
            const targetUserId = parseInt(data.split(':')[1]);
            const requestUserId = callbackQuery.from.id;

            // Solo el propietario puede agregar al pack
            if (targetUserId !== requestUserId) {
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: '⛔ Solo tú puedes agregar stickers a tu propio pack.',
                    show_alert: true
                });
                return;
            }

            const {
                consumeStickerSession,
                packExists,
                createStickerPack,
                addToStickerPack,
                getPackShortName
            } = require('./sticker-pack.handler');

            const fileId = consumeStickerSession(targetUserId);

            if (!fileId) {
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: '⏰ La sesión expiró. Crea el sticker de nuevo con !s.',
                    show_alert: true
                });
                return;
            }

            // Deshabilitar el botón mientras procesa
            await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });

            try {
                const botInfo = await bot.getMe();
                const botUsername = botInfo.username;
                const exists = await packExists(targetUserId, botUsername);

                if (exists) {
                    await addToStickerPack(targetUserId, fileId, botUsername);
                    const packName = `${getPackShortName(targetUserId)}_by_${botUsername}`;
                    await bot.editMessageText(
                        `✅ <b>¡Sticker agregado al pack!</b>\n\n📦 Ver pack: t.me/addstickers/${packName}`,
                        { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
                    );
                } else {
                    await createStickerPack(targetUserId, fileId, botUsername);
                    const packName = `${getPackShortName(targetUserId)}_by_${botUsername}`;
                    await bot.editMessageText(
                        `🎉 <b>¡Pack creado exitosamente!</b>\n\n📦 <b>Nombre:</b> Botillero 🎰\n🔗 Ver pack: t.me/addstickers/${packName}`,
                        { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
                    );
                }
            } catch (packErr) {
                console.error('(StickerPack) -> Error:', packErr.message);
                await bot.editMessageText(
                    `❌ <b>Error al gestionar el pack:</b>\n<code>${packErr.message}</code>`,
                    { chat_id: chatId, message_id: messageId, parse_mode: 'HTML' }
                );
            }
            return;
        }

    } catch (error) {
        console.error('❌ Error procesando callback:', error);
        
        try {
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: '❌ Hubo un error al procesar tu solicitud',
                show_alert: true
            });
        } catch (err) {
            console.error('❌ Error enviando notificación de error:', err);
        }
    }
}

module.exports = handleCallback;
