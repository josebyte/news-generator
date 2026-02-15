import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Función auxiliar para pausar la ejecución (definición de sleep)
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Lógica para interactuar con Gemini Flash
 * @param {Object} noticia - Objeto con title, content y sourceUrl
 * @param {Object} config - Configuración desde news.config.json
 * @param {String} domain - Dominio
 */
export async function generarContenido(noticia, config, domain) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
        ${config.basePrompt}
        Genera un JSON para un sitio web Astro basado en: ${noticia.title}
        Contenido de referencia: ${noticia.content}
        Secciones permitidas: ${config.sections.join(', ')}
        
        IMPORTANTE: Devuelve estrictamente un JSON con este formato y rellena la image con el src de la imagen original sin inventar, si la ruta de la imagen es relativa pon la ruta que tengas sin inventar nada:
        { 
          "title": "Título optimizado", 
          "summary": "Resumen corto", 
          "section": "Una de las permitidas", 
          "tags": ["tag1", "tag2"], 
          "content": "Cuerpo de la noticia en Markdown", 
          "image": "src de la imagen original" 
        }
    `;

    try {
        await sleep(1500); //wait before
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        await sleep(1500); //wait after
        return JSON.parse(text);
    } catch (error) {
        console.error("❌ Error en la generación con Gemini:", error.message);
        return null;
    }
}