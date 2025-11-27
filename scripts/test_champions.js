const { getChampionsMatches, getChampionsStandings } = require('../src/services/champions.service');

async function test() {
    console.log('--- Probando Partidos ---');
    const matches = await getChampionsMatches();
    console.log(matches);

    console.log('\n--- Probando Tabla ---');
    const standings = await getChampionsStandings();
    console.log(standings);
}

test();
