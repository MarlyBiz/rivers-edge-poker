<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/63c641c2-797a-4801-80e4-f8acccc481e7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Hosting (poker.marlylabs.app)

Static Vite build served by a Cloudflare Workers static-assets deploy (same setup as Gig Efficiency Tracker):

```
npm ci
npx vite build && npx wrangler deploy --config wrangler.jsonc
```

Installable PWA (`public/manifest.json`, `public/sw.js`, icons) with Install and Share buttons on the start screens.
No API key is needed: the game makes no Gemini calls.
