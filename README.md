# news generator library

## Install

```sh
npm install git+https://github.com/josebyte/news-generator.git
```

## Requirements

- API Key in .env
```
GEMINI_API_KEY=tu_api_key_aqui
```
- news.config.json in root folder
```
{
  "collectionDir": "src/content/noticias",
  "limitPerSource": 3,
  "sections": ["Tecnología", "IA", "Ciencia"],
  "basePrompt": "Eres un periodista de tecnología objetivo y conciso.",
  "sources": [
    { "name": "The Verge", "url": "[https://www.theverge.com/rss/index.xml](https://www.theverge.com/rss/index.xml)" }
  ],
  "defaults": {
    "draft": false
  }
}
```
## uses

- cli for 1 url:
```sh
npx generate-news --url https://www.theverge.com/2026/2/14/nueva-noticia-ia
```

- cli for generate multiple news
```sh
npx generate-news
```
