# StickmanAI

This project was converted from a single `index.html` file into a Vercel-friendly structure:

- `index.html`: app shell and static markup
- `src/styles.css`: extracted styles
- `src/main.js`: frontend entrypoint
- `src/game-app.js`: main canvas/game/chat logic
- `src/env.js`: client-side environment loading for Vite
- `api/generate.js`: Vercel Function that proxies Gemini requests with a server-side key
- `legacy/index.inline.html`: backup of the original one-file version

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start the frontend only:

```bash
npm run dev
```

3. Start the full app with Vercel Functions:

```bash
npm run dev:vercel
```

Use `dev:vercel` when you want `/api/generate` to work locally.

## Environment variables

Copy `.env.example` to `.env` and fill in the values you need.

- `VITE_*` values are exposed to the browser through Vite and are appropriate for Firebase client config.
- `GEMINI_API_KEY` stays server-side inside the Vercel Function.
- `GEMINI_MODEL` is optional and defaults to `gemini-2.5-flash`.

## Deploy to Vercel

1. Import the repo/folder into Vercel or run `vercel` from the project root.
2. Add the environment variables from `.env.example` in the Vercel project settings.
3. Deploy. Vercel will build the Vite frontend and expose `api/generate.js` as a function.

## Important feedback on the original file

- The original HTML mixed UI, game loop, Firebase setup, and AI calls in one file, which makes maintenance and deployment much harder.
- The Gemini request was effectively client-side, which is not safe for a real deployment because API keys should stay on the server.
- The app still executes AI-generated JavaScript with `new Function(...)`. That is a serious security risk for a public deployment and should be redesigned before exposing this widely.
- Tailwind is still loaded from the CDN to keep the migration small. If you want a more production-polished setup, the next step is to replace it with a normal Tailwind build or convert the remaining utility classes to local CSS.
