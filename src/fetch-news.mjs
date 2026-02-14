import fs from "node:fs/promises";
import path from "node:path";
import Parser from "rss-parser";

const parser = new Parser();

/**
 * Función para recolectar noticias y filtrar las ya existentes.
 * @param {Object} config - Objeto de configuración cargado desde news.config.json
 * @returns {Promise<Array>} Lista de nuevas entradas detectadas
 */
export async function runFetch(config) {
    const newsDir = path.resolve(process.cwd(), config.collectionDir);
    const LIMIT_PER_SOURCE = config.limitPerSource || 4;

    console.log("📡 Iniciando recolección de noticias RSS...");

    // 1. Escanear fuentes existentes para evitar duplicados
    let existingSources = new Set();
    try {
        const files = await fs.readdir(newsDir);
        for (const file of files) {
            if (file.endsWith(".md") || file.endsWith(".mdx")) {
                const content = await fs.readFile(path.join(newsDir, file), "utf-8");
                // Regex mejorada para capturar URLs en el frontmatter
                const match = content.match(/source_urls:\s*\[\s*["'](.*?)["']\s*\]/);
                if (match) existingSources.add(match[1].toLowerCase().trim());
            }
        }
    } catch (e) {
        await fs.mkdir(newsDir, { recursive: true });
    }

    // 2. Consultar fuentes RSS
    let newEntries = [];

    for (const source of config.sources) {
        try {
            console.log(`📡 Buscando en: ${source.name}...`);
            const feed = await parser.parseURL(source.url);
            let addedFromThisSource = 0;

            for (const item of feed.items) {
                if (addedFromThisSource >= LIMIT_PER_SOURCE) break;

                const sourceClean = item.link.trim().toLowerCase();

                if (!existingSources.has(sourceClean)) {
                    newEntries.push({
                        sourceName: source.name,
                        sourceUrl: item.link,
                        title: item.title.trim(),
                        content: item.contentSnippet || item.content || "Sin descripción."
                    });

                    existingSources.add(sourceClean);
                    addedFromThisSource++;
                }
            }
            console.log(`   ✅ +${addedFromThisSource} noticias nuevas de ${source.name}`);
        } catch (err) {
            console.error(`   ❌ Error en ${source.name}: ${err.message}`);
        }
    }

    return newEntries;
}

// Lógica para ejecución directa (standalone)
if (import.meta.url === `file://${process.argv[1]}`) {
    const CONFIG_PATH = path.join(process.cwd(), "news.config.json");
    const TEMP_PATH = "pending_news.json";

    try {
        const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf-8"));
        const news = await runFetch(config);
        await fs.writeFile(TEMP_PATH, JSON.stringify(news, null, 2));
        console.log(`\n✅ Guardadas ${news.length} noticias en ${TEMP_PATH}`);
    } catch (error) {
        console.error("🔴 Error en ejecución directa de fetch:", error.message);
    }
}