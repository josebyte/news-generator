import * as cheerio from 'cheerio';
import path from "node:path";
import { generarContenido } from "./gemini.mjs";
import { descargarImagen, guardarNoticia, obtenerDominio } from "./processor.mjs";

/**
 * Extrae la primera imagen de un string HTML y la convierte en URL absoluta
 */
export function extraerImagenRss(htmlContent, sourceUrl) {
    if (!htmlContent || typeof htmlContent !== 'string') return null;

    try {
        const $ = cheerio.load(htmlContent);
        // Buscamos la primera imagen
        const imgSrc = $('img').attr('src');

        if (!imgSrc) return null;

        // Si la ruta es relativa, la convertimos en absoluta
        if (!imgSrc.startsWith('http')) {
            const domain = obtenerDominio(sourceUrl);
            return new URL(imgSrc, domain).href;
        }
        return imgSrc;
    } catch (e) {
        return null;
    }
}

/**
 * Orquestador: Procesa la lógica de cada noticia
 */
export async function processArticle(noticia, config) {
    const domain = obtenerDominio(noticia.sourceUrl);

    // 1. Generar contenido con IA
    // Le pasamos la noticia original para que Gemini tenga contexto
    const art = await generarContenido(noticia, config, domain);
    if (!art) throw new Error("No se pudo generar contenido para: " + noticia.title);

    // 2. Gestión de Imagen (Lógica de rescate)
    if (!art.image) {
        console.log("🔍 IA no devolvió imagen, buscando en metadatos o HTML...");

        // Buscamos la URL en posibles campos donde un parseador XML genérico guarda <media:content>
        // Adaptado para: item['media:content'].url o item.mediaContent.url
        const imagenMetadata =
            noticia.mediaContent?.url ||
            noticia.mediaContent?.['@_url'] ||
            noticia.enclosure?.url;

        if (imagenMetadata) {
            art.image = imagenMetadata;
        } else {
            // Si no hay metadato, rascamos el HTML de la descripción
            const htmlParaBuscar = noticia.description || noticia.content || "";
            art.image = extraerImagenRss(htmlParaBuscar, noticia.sourceUrl);
        }
    }

    // 3. Descarga y Procesamiento de la imagen
    if (art.image) {
        const imagesFolder = path.join(process.cwd(), config.publicImagesDir);
        let finalImageUrl = art.image;

        // Asegurar URL absoluta
        if (finalImageUrl && !finalImageUrl.startsWith('http')) {
            finalImageUrl = new URL(finalImageUrl, domain).href;
        }

        try {
            console.log(`📥 Descargando imagen: ${finalImageUrl}`);
            const localPath = await descargarImagen(finalImageUrl, imagesFolder);
            // Reemplazamos la URL remota por la ruta local para el Markdown
            art.image = localPath || art.image;
        } catch (err) {
            console.error("⚠️ Fallo en descarga de imagen:", err.message);
            // Mantenemos la original si falla la descarga
        }
    }

    // 4. Guardar archivo final
    const fileName = await guardarNoticia(art, config, noticia.sourceUrl);
    return fileName;
}

/**
 * Función de ejemplo para iterar sobre tus noticias
 * @param {Array} noticias - Array de objetos noticia ya parseados del XML
 * @param {Object} config - Configuración de la app
 */
export async function mainLoop(noticias, config) {
    for (const noticia of noticias) {
        try {
            console.log(`\n🚀 Procesando: ${noticia.title}`);
            const result = await processArticle(noticia, config);
            console.log(`✅ Finalizado con éxito: ${result}`);
        } catch (error) {
            console.error(`❌ Error en el proceso: ${error.message}`);
        }
    }
}