#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { processArticle } from "../src/index.mjs";
import { runFetch } from "../src/fetch-news.mjs";

dotenv.config();

/**
 * CLI para la generación automática y manual de noticias
 * Uso:
 * npx generate-news          -> Modo automático (RSS)
 * npx generate-news --url X  -> Modo manual (URL específica)
 */
async function main() {
    const args = process.argv.slice(2);
    const mode = args[0]; // --url o undefined
    const value = args[1];

    // 1. Cargar Configuración del proyecto donde se ejecuta el comando
    const CWD = process.cwd();
    const CONFIG_PATH = path.join(CWD, "news.config.json");

    let config;
    try {
        const configData = await fs.readFile(CONFIG_PATH, "utf-8");
        config = JSON.parse(configData);
    } catch (err) {
        console.error("❌ Error: No se encontró 'news.config.json' en el directorio actual.");
        console.info("💡 Asegúrate de estar en la raíz de tu proyecto Astro.");
        process.exit(1);
    }

    try {
        if (mode === "--url" && value) {
            // --- MODO MANUAL ---
            console.log(`🔗 Modo Manual: Procesando URL única...`);
            const noticiaManual = {
                title: "Noticia desde URL",
                content: `Extraer contenido de esta URL: ${value}`,
                sourceUrl: value
            };

            const fileName = await processArticle(noticiaManual, config);
            console.log(`✅ ¡Éxito! Noticia generada en: ${fileName}`);

        } else {
            // --- MODO AUTOMÁTICO (RSS a Markdown directo) ---
            console.log("🤖 Iniciando Generador Automático (Gemini 3 Flash)");

            // Paso A: Recolectar noticias nuevas
            const nuevasNoticias = await runFetch(config);

            if (nuevasNoticias.length === 0) {
                console.log("ℹ️ No hay noticias nuevas en los feeds RSS. Todo al día.");
                return;
            }

            console.log(`\n📝 Se han detectado ${nuevasNoticias.length} noticias nuevas.`);

            // Paso B: Procesar cada una secuencialmente
            for (const [idx, noticia] of nuevasNoticias.entries()) {
                console.log(`\n✍️  [${idx + 1}/${nuevasNoticias.length}] Procesando: ${noticia.title}`);
                try {
                    const fileName = await processArticle(noticia, config);
                    console.log(`   ✅ Guardado: ${fileName}`);
                } catch (err) {
                    console.error(`   ⚠️ Error procesando "${noticia.title}":`, err.message);
                }
            }

            console.log("\n✨ Proceso de actualización finalizado correctamente.");
        }
    } catch (error) {
        console.error("\n🔴 Error crítico en el CLI:", error.message);
        process.exit(1);
    }
}

main();