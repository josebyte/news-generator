import path from "node:path";
import { generarContenido } from "./gemini.mjs";
import { descargarImagen, guardarNoticia, obtenerDominio } from "./processor.mjs";

/**
 * Orquestador: Procesa la lógica de cada noticia de forma robusta.
 * @param {Object} noticia - Objeto con la información base del RSS.
 * @param {Object} config - Configuración global de la aplicación.
 */
export async function processArticle(noticia, config) {
    const domain = obtenerDominio(noticia.sourceUrl);

    // 1. Generación de contenido con IA
    // Implementamos un bloque try/catch específico para la IA
    let art;
    try {
        art = await generarContenido(noticia, config, domain);
        if (!art) throw new Error("La IA devolvió un contenido vacío.");
    } catch (error) {
        throw new Error(`Error en Gemini: ${error.message}`);
    }

    // 2. Gestión de la imagen (Fallback y Normalización)
    // Priorizamos la imagen de la IA, si no existe, usamos la del RSS original
    const rawImageUrl = art.image || noticia.image;

    if (rawImageUrl) {
        const imagesFolder = path.resolve(process.cwd(), config.publicImagesDir);
        let finalImageUrl = rawImageUrl;

        // Normalización de URL: Maneja URLs relativas y protocolos faltantes
        try {
            if (!finalImageUrl.startsWith('http')) {
                // Intentamos construir la URL absoluta usando el dominio de la fuente
                finalImageUrl = new URL(finalImageUrl, domain).href;
            }

            console.log(`📥 Descargando imagen: ${finalImageUrl}`);
            const localPath = await descargarImagen(finalImageUrl, imagesFolder);

            // Si la descarga fue exitosa, usamos el path local; si no, mantenemos la URL remota
            art.image = localPath || finalImageUrl;
        } catch (err) {
            console.warn(`⚠️ No se pudo procesar la imagen (${finalImageUrl}): ${err.message}`);
            art.image = finalImageUrl; // Fallback a URL remota
        }
    }

    // 3. Persistencia
    // Pasamos la URL original para trazabilidad en el frontmatter
    try {
        const fileName = await guardarNoticia(art, config, noticia.sourceUrl);
        return fileName;
    } catch (error) {
        throw new Error(`Error al guardar el archivo: ${error.message}`);
    }
}

/**
 * Itera sobre el array de noticias secuencialmente para respetar límites de API.
 */
export async function mainLoop(noticias, config) {
    if (!Array.isArray(noticias) || noticias.length === 0) {
        console.log("Empty news list. Nothing to process.");
        return;
    }

    console.log(`\n--- Iniciando procesamiento de ${noticias.length} noticias ---`);

    for (const [index, noticia] of noticias.entries()) {
        try {
            console.log(`\n[${index + 1}/${noticias.length}] 🚀 Procesando: ${noticia.title}`);
            const result = await processArticle(noticia, config);
            console.log(`✅ Resultado: ${result}`);
        } catch (error) {
            // Logueamos el error pero no detenemos el bucle para que procese la siguiente noticia
            console.error(`❌ Error en "${noticia.title.substring(0, 30)}...": ${error.message}`);
        }
    }

    console.log("\n--- Tareas finalizadas ---");
}