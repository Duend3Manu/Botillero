"use strict";

async function handleKeywords(message) {
    const command = message.body.toLowerCase();

    if (command.includes('huaso')) {
        await message.react('😅');
        await message.reply('De seguro estamos hablando del huaso Fabián.');
    } else if (command.includes('borracho') || command.includes('watusi') || command.includes('watusy')) {
        await message.react('😅');
        await message.reply('😂😂😂😂😂😂😂 ahí te hablan Diego Garrido.');
    } else if (command.includes('boliviano') || command.includes('bolivia')) {
        await message.react('😅');
        await message.reply('😂😂😂😂😂😂😂 ahí te hablan Jesus.');
    } else if (command.includes('chanero') || command.includes('chaneros')) {
        await message.react('😅');
        await message.reply('😂😂😂😂😂😂😂 ahí te hablan Bastian.');
    } else if (command.includes('macabeo') || command.includes('casorio')) {
        await message.react('😅');
        await message.reply('😂😂😂😂😂😂😂 ahí te hablan Luis.');
    } else if (command.includes('nuco')) {
        await message.react('🤡');
        await message.reply('Tu hermana se lo come sin truco');
    }
}

module.exports = handleKeywords;
