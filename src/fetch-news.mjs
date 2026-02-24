import fs from "node:fs/promises";
import path from "node:path";
import Parser from "rss-parser";
import * as cheerio from 'cheerio';

// Configuración del parser para capturar metadatos extendidos de imágenes
const parser = new Parser({
    customFields: {
        item: [['media:content', 'mediaContent', { keepArray: false }]],
    }
});

/**
 * Recolecta noticias de fuentes RSS de forma secuencial.
 * @param {Object} config - Configuración (sources, collectionDir, limitPerSource)
 * @returns {Promise<Array>}
 */
export async function runFetch(config) {
    const newsDir = path.resolve(process.cwd(), config.collectionDir);
    const LIMIT_PER_SOURCE = config.limitPerSource || 4;
    const existingSources = new Set();

    console.log("📡 Iniciando recolección de noticias RSS...");

    // 1. Escanear archivos locales para evitar duplicados
    try {
        await fs.mkdir(newsDir, { recursive: true });
        const files = await fs.readdir(newsDir);

        for (const file of files) {
            if (/\.(md|mdx)$/.test(file)) {
                const content = await fs.readFile(path.join(newsDir, file), "utf-8");
                // Captura la URL del source en el frontmatter (soporta source_url o source_urls)
                const match = content.match(/source_urls?:\s*\[?\s*["'](.*?)["']/);
                if (match?.[1]) {
                    existingSources.add(match[1].toLowerCase().trim());
                }
            }
        }
    } catch (error) {
        console.warn("⚠️ No se pudo leer el directorio de noticias, se creará uno nuevo.");
    }

    // 2. Procesar fuentes una por una (Secuencial)
    const newEntries = [];

    for (const source of config.sources) {
        try {
            console.log(`📡 Buscando en: ${source.name}...`);
            const feed = await parser.parseURL(source.url);
            let addedFromThisSource = 0;

            for (const item of feed.items) {
                if (addedFromThisSource >= LIMIT_PER_SOURCE) break;

                const link = item.link?.trim();
                if (!link) continue;

                const linkKey = link.toLowerCase();

                if (!existingSources.has(linkKey)) {
                    newEntries.push({
                        sourceName: source.name,
                        sourceUrl: link,
                        title: item.title?.trim() || "Sin título",
                        content: item.contentSnippet || item.content || "Sin descripción.",
                        image: extraerImagenRss(item), // Pasamos el item completo
                        date: item.pubDate || new Date().toISOString()
                    });

                    existingSources.add(linkKey);
                    addedFromThisSource++;
                }
            }
            console.log(`   ✅ +${addedFromThisSource} noticias de ${source.name}`);
        } catch (err) {
            console.error(`   ❌ Error en ${source.name}: ${err.message}`);
        }
    }

    return newEntries;
}

/**
 * Extrae la imagen del item priorizando metadatos sobre scraping HTML
 */
export function extraerImagenRss(item) {
    if (!item) return "";

    // 1. Prioridad: Enclosure (estándar RSS)
    if (item.enclosure?.url) return item.enclosure.url;

    // 2. Segunda prioridad: Media Content (vía customFields del parser)
    if (item.mediaContent?.$?.url) return item.mediaContent.$.url;

    // 3. Tercera prioridad: Scraping del HTML contenido
    const html = item.content || item['content:encoded'] || "";
    if (html) {
        try {
            const $ = cheerio.load(html);
            const imgSrc = $('img').attr('src');
            if (imgSrc) return imgSrc;
        } catch (e) {
            return "";
        }
    }

    return "";
}

// Lógica para ejecución directa
if (import.meta.url === `file://${process.argv[1]}`) {
    const CONFIG_PATH = path.join(process.cwd(), "news.config.json");
    const TEMP_PATH = "pending_news.json";

    (async () => {
        try {
            const configData = await fs.readFile(CONFIG_PATH, "utf-8");
            const config = JSON.parse(configData);
            const news = await runFetch(config);

            await fs.writeFile(TEMP_PATH, JSON.stringify(news, null, 2));
            console.log(`\n✅ Proceso completado. ${news.length} noticias nuevas en ${TEMP_PATH}`);
        } catch (error) {
            console.error("🔴 Error en ejecución directa:", error.message);
        }
    })();
}