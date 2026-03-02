// src/services/deals.service.js
// Servicio de búsqueda de ofertas en sitios chilenos: SoloTodo, Knasta, Descuentosrata
'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────

/** Parsea un precio CLP desde string: "$49.990" → 49990 */
function parsePrice(str) {
    if (!str) return 0;
    const clean = str.replace(/[^\d]/g, '');
    return parseInt(clean, 10) || 0;
}

/** Calcula el % de descuento entre precio normal y precio oferta */
function calcDiscount(normal, offer) {
    if (!normal || !offer || normal <= offer) return 0;
    return Math.round(((normal - offer) / normal) * 100);
}

/** Formatea número como precio CLP: 49990 → "$49.990" */
function formatPrice(num) {
    if (!num || num === 0) return 'N/D';
    return '$' + num.toLocaleString('es-CL');
}

/** Trunca texto largo */
function truncate(str, max = 60) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

// ─────────────────────────────────────────────
// SOLOTODO  (API REST pública)
// ─────────────────────────────────────────────

/**
 * Busca productos en SoloTodo usando su API pública.
 * Especializado en tecnología, electrónica y electrodomésticos.
 * @param {string} query
 * @returns {Promise<Array>}
 */
async function searchSolotodo(query) {
    try {
        const url = `https://publicapi.solotodo.com/products/browse/?search=${encodeURIComponent(query)}&page_size=5`;
        const resp = await axios.get(url, { timeout: 10000 });
        const results = resp.data?.results || [];

        const searchUrl = `https://www.solotodo.cl/search?search=${encodeURIComponent(query)}`;

        return results.map(bucket => {
            const entry = bucket.product_entries?.[0];
            if (!entry) return null;

            const product = entry.product;
            const meta = entry.metadata;
            const prices = meta?.prices_per_currency?.[0];

            const normalPrice = parseFloat(prices?.normal_price || 0);
            const offerPrice = parseFloat(prices?.offer_price || 0);
            
            // Filtrar irrelevantes, precios anómalos o descuentos negativos
            if (meta?.score !== undefined && meta.score < 2) return null;
            if (offerPrice < 5000) return null;
            if (normalPrice > 0 && offerPrice >= normalPrice) return null;

            const discountPct = calcDiscount(normalPrice, offerPrice);

            return {
                nombre: truncate(product.name),
                precio: Math.round(offerPrice),
                precioOriginal: Math.round(normalPrice),
                descuento: discountPct,
                url: searchUrl,
                tienda: 'SoloTodo',
                fuente: '🖥️ SoloTodo'
            };
        }).filter(Boolean).slice(0, 3);
    } catch (err) {
        console.error('[deals] SoloTodo error:', err.message);
        return [];
    }
}

// ─────────────────────────────────────────────
// KNASTA  (SSR Next.js — extrae __NEXT_DATA__)
// ─────────────────────────────────────────────

/**
 * Busca productos en Knasta.cl.
 * El site usa SSR con Next.js, los datos vienen en <script id="__NEXT_DATA__">.
 * @param {string} query
 * @returns {Promise<Array>}
 */
async function searchKnasta(query) {
    try {
        const url = `https://knasta.cl/results?q=${encodeURIComponent(query)}`;
        const resp = await axios.get(url, {
            timeout: 12000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-CL,es;q=0.9'
            }
        });

        const $ = cheerio.load(resp.data);
        const nextDataRaw = $('#__NEXT_DATA__').text();
        if (!nextDataRaw) return [];

        const nextData = JSON.parse(nextDataRaw);
        const products = nextData?.props?.pageProps?.initialData?.products || [];

        return products.map(p => {
            const current = parseFloat(p.current_price || 0);
            const last = parseFloat(p.last_variation_price || p.original_price || 0);
            
            // Filtrar precios anómalos o sin descuento real
            if (current < 5000) return null;
            if (last > 0 && current >= last) return null;

            const discountPct = p.percent ? Math.abs(parseInt(p.percent, 10)) : calcDiscount(last, current);

            return {
                nombre: truncate(p.title || p.name || 'Producto'),
                precio: Math.round(current),
                precioOriginal: Math.round(last) || null,
                descuento: discountPct,
                url: p.url || `https://knasta.cl/results?q=${encodeURIComponent(query)}`,
                tienda: p.retail_label || p.retailer || 'Knasta',
                fuente: '🛍️ Knasta'
            };
        }).filter(p => p && p.precio > 0).slice(0, 3);
    } catch (err) {
        console.error('[deals] Knasta error:', err.message);
        return [];
    }
}

// ─────────────────────────────────────────────
// DESCUENTOS RATA  (Puppeteer — JS required)
// ─────────────────────────────────────────────

/**
 * Busca productos en DescuentosRata.com.
 * El site usa Nuxt.js con renderizado en cliente, requiere Puppeteer.
 * @param {string} query
 * @returns {Promise<Array>}
 */
async function searchDescuentosrata(query) {
    let browser = null;
    try {
        // Usa el mismo puppeteer-core que usa whatsapp-web.js
        const puppeteer = require('puppeteer-core');

        // Ruta al Chrome usado por whatsapp-web.js (la más compatible)
        const executablePath = (function findChrome() {
            const candidates = [
                // Chrome instalado en Windows
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                // Edge como fallback
                'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
                'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
            ];
            const fs = require('fs');
            for (const c of candidates) {
                if (fs.existsSync(c)) return c;
            }
            return null;
        })();

        if (!executablePath) {
            console.warn('[deals] DescuentosRata: No se encontró Chrome/Edge para Puppeteer.');
            return [];
        }

        browser = await puppeteer.launch({
            executablePath,
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1280,800']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        const searchUrl = `https://descuentosrata.com/oferta`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });

        try {
            await page.waitForSelector('#inputSearch', { timeout: 8000 });
            await page.type('#inputSearch', query);
            await page.keyboard.press('Enter');
            // Esperar un poco para que los resultados filtren
            await new Promise(r => setTimeout(r, 2500));
            await page.waitForSelector('a.text-decoration-none', { timeout: 5000 });
        } catch (_) {
            console.warn('[deals] DescuentosRata: Timeout esperando resultados de búsqueda');
        }

        // Extraer datos directamente desde el DOM usando los selectores específicos
        const products = await page.evaluate(() => {
            const results = [];

            // Selector de tarjeta confirmado
            const cards = document.querySelectorAll('a.text-decoration-none');

            for (const card of cards) {
                try {
                    // URL
                    const href = card.getAttribute('href') || '';
                    const url = href.startsWith('http') ? href : `https://descuentosrata.com${href}`;

                    // Tienda
                    const tiendaEl = card.querySelector('h6');
                    const tienda = tiendaEl?.textContent?.trim() || 'Descuentos Rata';

                    // Título razonable
                    const titleEl = card.querySelector('.line-clamp--3, .font-weight-bold.line-clamp, p, h3, h4, h5, [class*="title"]:not(h6)');
                    const nombre = titleEl?.textContent?.trim() || card.getAttribute('aria-label') || 'Oferta Rata';
                    if (!nombre || nombre.length < 3) continue;

                    // Precio oferta
                    const precioEl = card.querySelector('span');
                    const txtPrecio = precioEl?.textContent?.trim() || '';
                    let precio = 0;
                    if (txtPrecio.startsWith('$')) {
                        precio = parseInt(txtPrecio.replace(/[^\d]/g, ''), 10);
                    }

                    // Precio original
                    const poEl = card.querySelector('small[aria-label="Precio anterior"], .oferta-precio-anterior');
                    let precioOriginal = 0;
                    if (poEl) {
                        const txtPo = poEl.textContent.trim();
                        if (txtPo.startsWith('$')) {
                            precioOriginal = parseInt(txtPo.replace(/[^\d]/g, ''), 10);
                        }
                    }

                    // Descuentos negativos o precios inusualmente bajos
                    if (precio < 5000) continue;
                    if (precioOriginal > 0 && precio >= precioOriginal) continue;

                    let descuento = 0;
                    if (precioOriginal > 0 && precio > 0 && precioOriginal > precio) {
                        descuento = Math.round(((precioOriginal - precio) / precioOriginal) * 100);
                    }



                    if (precio > 0) {
                        results.push({ nombre, precio, precioOriginal, descuento, url, tienda });
                    }
                } catch (_) { /* ignorar tarjeta con error */ }
            }

            return results.slice(0, 5);
        });

        return products.slice(0, 3).map(p => ({
            ...p,
            nombre: p.nombre.slice(0, 60),
            fuente: '🐀 Descuentos Rata'
        }));

    } catch (err) {
        console.error('[deals] DescuentosRata error:', err.message);
        return [];
    } finally {
        if (browser) {
            try { await browser.close(); } catch (_) {}
        }
    }
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: buscar en los 3 sitios
// ─────────────────────────────────────────────

/**
 * Busca en los 3 sitios en paralelo y devuelve max 9 resultados
 * (3 por fuente), ordenados por descuento descendente.
 * @param {string} query
 * @returns {Promise<Array>}
 */
async function searchAllDeals(query) {
    const [solotodo, knasta, rata] = await Promise.allSettled([
        searchSolotodo(query),
        searchKnasta(query),
        searchDescuentosrata(query)
    ]);

    const results = [
        ...(solotodo.status === 'fulfilled' ? solotodo.value.slice(0, 3) : []),
        ...(knasta.status  === 'fulfilled' ? knasta.value.slice(0, 3)  : []),
        ...(rata.status    === 'fulfilled' ? rata.value.slice(0, 3)    : [])
    ];

    // Ordenar por descuento descendente (mayor oferta primero)
    results.sort((a, b) => (b.descuento || 0) - (a.descuento || 0));

    return results.slice(0, 9);
}

module.exports = {
    searchAllDeals,
    formatPrice
};
