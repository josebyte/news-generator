import { generarContenido } from "./gemini.mjs";
import { descargarImagen, guardarNoticia } from "./processor.mjs";
import path from "node:path";

/**
 * Orquestador: De texto bruto a archivo Markdown final
 */
export async function processArticle(noticia, config) {
    // 1. Generar con IA
    const art = await generarContenido(noticia, config);
    if (!art) throw new Error("No se pudo generar contenido para: " + noticia.title);

    // 2. Gestionar Imagen
    if (art.image && art.image.startsWith('http')) {
        const imagesFolder = path.join(process.cwd(), 'public/images/noticias');
        const localPath = await descargarImagen(art.image, imagesFolder);
        art.image = localPath || art.image;
    }

    // 3. Guardar Markdown
    const fileName = await guardarNoticia(art, config, noticia.sourceUrl);
    return fileName;
}