import fs from "node:fs/promises";
import path from "node:path";

export const slugify = (text) => text?.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-') || `news-${Date.now()}`;

/**
 * Descarga una imagen remota a la carpeta local del proyecto
 */
export async function descargarImagen(url, folderPath) {
    try {
        const fileName = `${Date.now()}-${url.split('/').pop().split('?')[0] || 'img.jpg'}`;
        const filePath = path.join(folderPath, fileName);

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.mkdir(folderPath, { recursive: true });
        await fs.writeFile(filePath, buffer);

        return `/images/noticias/${fileName}`;
    } catch (error) {
        console.error(`⚠️ Error descarga imagen (${url}):`, error.message);
        return null;
    }
}

/**
 * Crea el archivo .md con el Frontmatter para Astro
 */
export async function guardarNoticia(art, config, sourceUrl) {
    const fileName = `${slugify(art.title)}.md`;
    const fullPath = path.join(process.cwd(), config.collectionDir, fileName);

    const fileContent = `---
title: "${art.title.replace(/"/g, "'")}"
date: ${new Date().toISOString()}
section: "${art.section}"
tags: ${JSON.stringify(art.tags)}
draft: ${config.defaults?.draft || false}
summary: "${art.summary.replace(/"/g, "'")}"
source_urls: ["${sourceUrl}"]
image: "${art.image || ''}"
---

${art.content}`;

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, fileContent);
    return fileName;
}