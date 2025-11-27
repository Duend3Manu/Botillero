// test_champions.js - Test de los comandos de Champions League
"use strict";

const { getChampionsMatches, getChampionsStandings } = require('./src/services/champions.service.js');

async function runTests() {
    console.log('🧪 PRUEBAS DE CHAMPIONS LEAGUE\n');
    console.log('================================\n');

    // Test 1: Partidos
    console.log('📋 TEST 1: Obtener partidos de Champions\n');
    try {
        const matches = await getChampionsMatches();
        console.log(matches);
        console.log('\n✅ TEST 1 PASADO\n');
    } catch (error) {
        console.error('❌ TEST 1 FALLÓ:', error.message, '\n');
    }

    console.log('================================\n');

    // Test 2: Tabla de posiciones
    console.log('📋 TEST 2: Obtener tabla de posiciones\n');
    try {
        const standings = await getChampionsStandings();
        console.log(standings);
        console.log('\n✅ TEST 2 PASADO\n');
    } catch (error) {
        console.error('❌ TEST 2 FALLÓ:', error.message, '\n');
    }

    console.log('================================\n');
    console.log('✅ TODAS LAS PRUEBAS COMPLETADAS\n');
    process.exit(0);
}

runTests().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
