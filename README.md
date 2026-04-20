# StickmanAI

This project was converted from a single `index.html` file into a Vercel-friendly structure:

- `index.html`: app shell and static markup
- `src/styles.css`: extracted styles
- `src/main.js`: frontend entrypoint
- `src/game-app.js`: main canvas/game/debug-log logic
- `src/env.js`: client-side environment loading for Vite
- `api/generate.js`: Vercel Function that proxies OpenAI Responses API requests with a server-side key
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

- `OPENAI_API_KEY` stays server-side inside the Vercel Function.
- `OPENAI_MODEL` is optional and defaults to `gpt-5.4`.

## Deploy to Vercel

1. Import the repo/folder into Vercel or run `vercel` from the project root.
2. Add the environment variables from `.env.example` in the Vercel project settings.
3. Deploy. Vercel will build the Vite frontend and expose `api/generate.js` as a function.

## Important feedback on the original file

- The original HTML mixed UI, game loop, chat/persistence setup, and AI calls in one file, which makes maintenance and deployment much harder.
- The LLM request must stay server-side in Vercel Functions so the API key never reaches the browser.
- The app still executes AI-generated JavaScript with `new Function(...)`. That is a serious security risk for a public deployment and should be redesigned before exposing this widely.
- Firebase has been removed entirely. The right-side panel now serves as a local debug/error log instead of a chat surface.
- Tailwind has been removed from the runtime UI in favor of local CSS, which also eliminates the CDN-in-production warning.
