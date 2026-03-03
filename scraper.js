// ============================================================================
// SCRAPER DE PORINGA.NET
// - buscarPostsEnWeb(term): busca posts reales (sin ads) y devuelve sus datos
// - descargarImagenesDePost(postUrl): extrae todas las imágenes de un post
// - Si se ejecuta directamente (node scraper.js), levanta un servidor web de prueba
// ============================================================================

const puppeteer = require('puppeteer');
const express   = require('express');
const https     = require('https');
const http      = require('http');

const app  = express();
const PORT = 3000;

// Headers para burlar el hotlink-protection de poringa.net
const HEADERS_PORINGA = {
    'Referer': 'https://www.poringa.net/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
};

const fs = require('fs');

// Rutas comunes de Chrome en Windows
const CHROME_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome Beta\\Application\\chrome.exe',
];

function encontrarChrome() {
    for (const ruta of CHROME_PATHS) {
        try { if (fs.existsSync(ruta)) return ruta; } catch {}
    }
    return null; // Usar Chromium de Puppeteer como fallback
}

const CHROME_EJECUTABLE = encontrarChrome();
if (CHROME_EJECUTABLE) {
    console.log(`[+] Usando Chrome del sistema: ${CHROME_EJECUTABLE}`);
} else {
    console.log(`[+] Chrome del sistema no encontrado, usando Chromium de Puppeteer.`);
}

/** Abre un browser Puppeteer rápido y limpio */
async function abrirBrowser() {
    const opts = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    };
    if (CHROME_EJECUTABLE) opts.executablePath = CHROME_EJECUTABLE;
    return puppeteer.launch(opts);
}


/** Bloquea CSS y fuentes para acelerar la carga */
function bloquearRecursosInnecesarios(page) {
    return page.setRequestInterception(true).then(() => {
        page.on('request', (req) => {
            if (['stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });
    });
}

/** Hace scroll completo para revelar imágenes con lazy-loading */
async function scrollCompleto(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 200;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= document.body.scrollHeight - window.innerHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 80);
        });
    });
}

// ============================================================================
// FUNCIÓN 1: Buscar posts reales en la página de resultados
// Retorna: [{ postUrl, titulo, thumbnail }]
// ============================================================================
async function buscarPostsEnWeb(terminoDeBusqueda, limite = 10) {
    console.log(`\n[+] Buscando posts para: "${terminoDeBusqueda}"...`);

    const browser = await abrirBrowser();
    const page    = await browser.newPage();
    await bloquearRecursosInnecesarios(page);

    try {
        const urlBusqueda = `https://www.poringa.net/search?q=${encodeURIComponent(terminoDeBusqueda)}`;
        await page.goto(urlBusqueda, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await scrollCompleto(page);

        const posts = await page.evaluate(() => {
            const resultados = [];

            // Los posts reales en poringa siempre tienen href con /posts/imagenes/ o /posts/videos/
            const links = document.querySelectorAll('a[href*="/posts/"]');

            links.forEach((a) => {
                const href = a.getAttribute('href') || '';

                // Filtrar: solo posts de imágenes o videos (no comentarios, perfiles, etc.)
                if (!href.match(/\/posts\/(imagenes|videos)\//)) return;

                // Evitar duplicados (puede haber el mismo link en título e imagen)
                if (resultados.some(r => r.postUrl === href)) return;

                // Título del post
                const titulo = (a.getAttribute('title') || a.textContent || '').trim();
                if (!titulo) return;

                // Buscar thumbnail dentro del contenedor del post
                // Subir al contenedor padre y buscar la primera img relevante
                let thumbnail = null;
                let el = a;
                for (let i = 0; i < 5 && el; i++) {
                    el = el.parentElement;
                    if (!el) break;
                    const img = el.querySelector('img[src], img[data-src], img[data-original]');
                    if (img) {
                        const src = img.getAttribute('data-src') || img.getAttribute('data-original') || img.src;
                        // Filtrar avatares, logos, banners, ads
                        const esBasura = src && src.match(/(avatar|logo|banner|icon|flag|badge|sprite|default|blank|1x1|\.svg|ad\.|ads\.)/i);
                        if (src && src.startsWith('http') && !esBasura) {
                            thumbnail = src;
                            break;
                        }
                    }
                }

                resultados.push({
                    postUrl: href.startsWith('http') ? href : `https://www.poringa.net${href}`,
                    titulo,
                    thumbnail
                });
            });

            return resultados;
        });

        console.log(`[+] Posts encontrados: ${posts.length}`);
        return posts.slice(0, limite);

    } catch (error) {
        console.error(`[-] Error en buscarPostsEnWeb: ${error.message}`);
        return [];
    } finally {
        await browser.close();
    }
}

// ============================================================================
// FUNCIÓN 2: Descargar todas las imágenes de un post específico
// Retorna: [{ url, tipo }]  (tipo: 'imagen' | 'video')
// ============================================================================
async function descargarImagenesDePost(postUrl) {
    console.log(`\n[+] Extrayendo imágenes del post: ${postUrl}`);

    const browser = await abrirBrowser();
    const page    = await browser.newPage();
    await bloquearRecursosInnecesarios(page);

    try {
        await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await scrollCompleto(page);

        const items = await page.evaluate(() => {
            // El contenido real del post en Poringa está en el contenedor principal
            // Intentamos varios selectores comunes
            const contenedores = [
                document.querySelector('.post-content'),
                document.querySelector('.post_content'),
                document.querySelector('article'),
                document.querySelector('#post-content'),
                document.querySelector('.entry-content'),
                document.querySelector('main')
            ].filter(Boolean);

            const contenedor = contenedores[0] || document.body;

            const resultados = [];
            const urlsVistas = new Set();

            contenedor.querySelectorAll('img, video source, video').forEach((el) => {
                const src = el.getAttribute('data-src') || el.getAttribute('data-original') || el.src || '';
                if (!src || !src.startsWith('http')) return;
                if (urlsVistas.has(src)) return;

                // Filtros anti-ads y anti-basura
                const esBasura = src.match(/(avatar|logo|banner|icon|flag|badge|sprite|default|blank|1x1|\.svg|ad\.|ads\.|doubleclick|facebook\.com|twitter\.com)/i);
                const esBase64 = src.startsWith('data:');
                if (esBasura || esBase64) return;

                // Excluir imágenes de sidebar / related posts (urls muy cortas = miniaturas de nav)
                if (src.includes('/thumb/') || src.includes('/small/')) return;

                const esVideo = src.match(/\.(mp4|webm|ogg|mov)$/i) || el.tagName.toLowerCase() === 'video';

                urlsVistas.add(src);
                resultados.push({ url: src, tipo: esVideo ? 'video' : 'imagen' });
            });

            return resultados;
        });

        console.log(`[+] Imágenes en el post: ${items.length}`);
        return items;

    } catch (error) {
        console.error(`[-] Error en descargarImagenesDePost: ${error.message}`);
        return [];
    } finally {
        await browser.close();
    }
}

// ============================================================================
// SERVIDOR WEB DE PRUEBA (solo cuando se ejecuta directo: node scraper.js)
// ============================================================================

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Poringa Scraper</title>
            <style>
                body { font-family: sans-serif; background:#121212; color:white; text-align:center; padding:20px; }
                input { padding:10px; width:300px; border-radius:5px; border:none; }
                button { padding:10px 20px; border-radius:5px; border:none; background:#2ecc71; color:white; cursor:pointer; font-weight:bold; }
                .galeria { display:flex; flex-wrap:wrap; justify-content:center; gap:15px; margin-top:20px; }
                .item { background:#222; padding:10px; border-radius:10px; width:350px; }
                img { max-width:100%; max-height:300px; border-radius:5px; object-fit:contain; }
                a { color:#2ecc71; }
            </style>
        </head>
        <body>
            <h1>Buscador Poringa ⚡</h1>
            <input type="text" id="busqueda" placeholder="Ej: vladislava">
            <button onclick="buscar()">Buscar</button>
            <p id="estado"></p>
            <div class="galeria" id="resultados"></div>
            <script>
                async function buscar() {
                    const termino = document.getElementById('busqueda').value;
                    const estado = document.getElementById('estado');
                    const contenedor = document.getElementById('resultados');
                    if (!termino) return;
                    estado.innerHTML = 'Buscando... 🚀';
                    contenedor.innerHTML = '';
                    const datos = await (await fetch('/api/buscar?q=' + encodeURIComponent(termino))).json();
                    estado.innerText = \`\${datos.length} posts encontrados\`;
                    datos.forEach(p => {
                        const div = document.createElement('div');
                        div.className = 'item';
                        div.innerHTML = \`
                            \${p.thumbnail ? \`<img src="/api/imagen?url=\${encodeURIComponent(p.thumbnail)}">\` : ''}
                            <p><a href="\${p.postUrl}" target="_blank">\${p.titulo}</a></p>
                        \`;
                        contenedor.appendChild(div);
                    });
                }
            </script>
        </body>
        </html>
    `);
});

app.get('/api/buscar', async (req, res) => {
    const termino = req.query.q;
    if (!termino) return res.status(400).json({ error: 'Falta el término' });
    const resultados = await buscarPostsEnWeb(termino);
    res.json(resultados);
});

app.get('/api/imagen', (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send('Falta la URL');
    const client = imageUrl.startsWith('https') ? https : http;
    client.get(imageUrl, { headers: HEADERS_PORINGA }, (proxyRes) => {
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
            return res.redirect('/api/imagen?url=' + encodeURIComponent(proxyRes.headers.location));
        }
        if (proxyRes.headers['content-type']) res.setHeader('Content-Type', proxyRes.headers['content-type']);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        proxyRes.pipe(res);
    }).on('error', () => res.status(500).send('Error'));
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n================================================`);
        console.log(`[🚀] SERVIDOR ACTIVO en http://localhost:${PORT}`);
        console.log(`================================================\n`);
    });
}

module.exports = { buscarPostsEnWeb, descargarImagenesDePost };