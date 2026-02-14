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
    if (art.image) {
        const imagesFolder = path.join(process.cwd(), 'public/images/noticias');

        console.log("art.image")
        console.log(art.image)
        let finalImageUrl = art.image || null;

        // Si la IA devuelve una ruta relativa, intentamos reconstruirla
        if (finalImageUrl && !finalImageUrl.startsWith('http')) {
            const domain = new URL(noticia.sourceUrl).origin;
            console.log("domain")
            console.log(domain)
            finalImageUrl = new URL(finalImageUrl, domain).href;
        }
        console.log("finalImageUrl")
        console.log(finalImageUrl)

        const localPath = await descargarImagen(finalImageUrl, imagesFolder);
        art.image = localPath || art.image;
    }

    console.log(fileName)

    // 3. Guardar Markdown
    const fileName = await guardarNoticia(art, config, noticia.sourceUrl);
    return fileName;
}