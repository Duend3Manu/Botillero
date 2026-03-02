// scripts/test-oferta.js
// Uso: node scripts/test-oferta.js zapatillas nike
'use strict';

const { searchAllDeals, formatPrice } = require('../src/services/deals.service');

const query = process.argv.slice(2).join(' ');

if (!query) {
    console.log('⚠️  Uso: node scripts/test-oferta.js <producto>');
    console.log('   Ejemplo: node scripts/test-oferta.js zapatillas nike');
    process.exit(1);
}

console.log(`\n🔍 Buscando ofertas para: "${query}"`);
console.log('⏳ Esto puede tardar hasta 30 segundos (Puppeteer para Descuentos Rata)...\n');

const start = Date.now();

searchAllDeals(query).then(results => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (!results.length) {
        console.log('😕 No se encontraron resultados.');
        process.exit(0);
    }

    console.log(`✅ ${results.length} resultado(s) en ${elapsed}s\n`);
    console.log('─'.repeat(60));

    results.forEach((p, i) => {
        const disc = p.descuento > 0 ? ` (-${p.descuento}% 🔥)` : '';
        const orig = p.precioOriginal && p.precioOriginal > p.precio
            ? ` (antes ${formatPrice(p.precioOriginal)})`
            : '';

        console.log(`${i + 1}. ${p.fuente}`);
        console.log(`   📦 ${p.nombre}`);
        console.log(`   💰 ${formatPrice(p.precio)}${orig}${disc}`);
        console.log(`   🏪 ${p.tienda}`);
        console.log(`   🔗 ${p.url}`);
        console.log('─'.repeat(60));
    });

    process.exit(0);
}).catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
