import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Lógica para interactuar con Gemini 2.5 Flash
 * @param {Object} noticia - Objeto con title, content y sourceUrl
 * @param {Object} config - Configuración desde news.config.json
 */
export async function generarContenido(noticia, config) {
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
        
        IMPORTANTE: Devuelve estrictamente un JSON con este formato:
        { 
          "title": "Título optimizado", 
          "summary": "Resumen corto", 
          "section": "Una de las permitidas", 
          "tags": ["tag1", "tag2"], 
          "content": "Cuerpo de la noticia en Markdown", 
          "image": "src absoluto de la imagen original" 
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text);
    } catch (error) {
        console.error("❌ Error en la generación con Gemini:", error.message);
        return null;
    }
}