const metroService = require('../../services/metro.service');
const leagueService = require('../../services/league.service');
const nationalTeamService = require('../../services/nationalTeam.service');
const economyService = require('../../services/economy.service'); // <-- 1. IMPORTAR

async function handleMessage(message) {
  const rawText = message.body.toLowerCase().trim();
  let replyMessage = '';

  if (!rawText.startsWith('!') && !rawText.startsWith('/')) {
    return;
  }

  const command = rawText.substring(1);
  console.log(`(Controlador) -> Comando limpio: "${command}"`);

  switch (command) {
    case 'metro':
      replyMessage = await metroService.getMetroStatus();
      break;

    case 'ligatabla':
      replyMessage = await leagueService.getLeagueTable();
      break;
    case 'ligapartidos':
      replyMessage = await leagueService.getLeagueUpcomingMatches();
      break;

    case 'selecciontabla':
      replyMessage = await nationalTeamService.getQualifiersTable();
      break;
    case 'seleccionpartidos':
      replyMessage = await nationalTeamService.getQualifiersMatches();
      break;

    case 'valores': // <-- 2. AÑADIR EL NUEVO CASO
      replyMessage = await economyService.getEconomicIndicators();
      break;

    default:
      replyMessage = `Comando no reconocido.`;
      break;
  }
  
  return replyMessage;
}

module.exports = { handleMessage };