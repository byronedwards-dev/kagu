# Kagu Kids — Book Builder

AI-powered personalized children's storybook creator. Goes from creative brief → story concepts → characters → outline → text → image prompts → image generation → export.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up API keys
cp .env.local.example .env.local
# Edit .env.local with your keys (at minimum, add ANTHROPIC_API_KEY)

# 3. Run dev server
npm run dev
# Open http://localhost:3000
```

## API Keys

| Service | What it powers | Get a key |
|---------|---------------|-----------|
| **Anthropic** (required) | Story generation, concepts, prompts | [console.anthropic.com](https://console.anthropic.com/) |
| **Black Forest Labs** | Flux Pro image generation | [api.bfl.ml](https://api.bfl.ml/) |
| **Ideogram** | Ideogram V2A/V3 image generation | [developer.ideogram.ai](https://developer.ideogram.ai/) |
| **Google Gemini** | Nano Banana / Nano Banana Pro images | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **ImagineArt** | ImagineArt Realistic (limited API) | [platform.imagine.art](https://platform.imagine.art/) |

You only need the Anthropic key to use the story creation workflow. Add image generation keys as needed — the UI will show errors for unconfigured models.

## Architecture

```
app/
├── page.js                    ← Main React UI (client component)
├── layout.js                  ← Root layout with fonts
├── api/
│   ├── claude/route.js        ← Proxies to Anthropic Messages API
│   ├── generate-flux/route.js ← Black Forest Labs Flux Pro
│   ├── generate-ideogram/route.js ← Ideogram V2A
│   ├── generate-gemini/route.js   ← Google Gemini (Nano Banana)
│   └── generate-imagine/route.js  ← ImagineArt/Vyro
lib/
├── api.js                     ← Client-side helpers + model metadata
```

All API keys stay server-side in Next.js API routes — never exposed to the browser.

## Image Generation Models

| Model | Provider | Cost | Best For |
|-------|----------|------|----------|
| Flux Pro 1.1 | Black Forest Labs | ~$0.04/img | Most books — cinematic feel |
| Flux Max | Black Forest Labs | ~$0.06/img | Premium, complex scenes |
| Ideogram V2A | Ideogram | ~$0.04/img | Experimental, stylized |
| Ideogram Quality | Ideogram | ~$0.08/img | Final renders |
| Nano Banana | Google Gemini | ~$0.02/img | Quick drafts |
| Nano Banana Pro | Google Gemini | ~$0.04/img | Warm emotional scenes |
| ImagineArt Realistic | Vyro | ~$0.03/img | Fallback photorealistic |

**Note:** ImagineArt's "Imagine Pro" model (Ben's top pick) is only available in their web UI, not the API. Use the "📋 Copy" button on prompts to paste into ImagineArt's web interface for that model.

## Workflow

1. **Brief** — Fill in creative parameters (age, theme, characters, etc.)
2. **Concepts** — AI generates 4 storyline options; pick and refine one
3. **Characters** — AI writes detailed character descriptions for image prompts
4. **Outline** — 22-page outline with transitions and image-only markers
5. **Text** — Story text written in batches of 3 pages
6. **Prompts** — Image prompts generated per page with full character descriptions
7. **Images** — Generate images via API or copy prompts for external tools
8. **Export** — Copy all content or download full JSON backup

## Deploy to Vercel

```bash
npx vercel
# Follow prompts, add env vars in Vercel dashboard
```

## Notes

- Sessions auto-save to localStorage every 2 seconds
- All image generation happens server-side through API routes
- The Gemini model controls aspect ratio through prompt text (not a parameter)
- Flux API is async — submit then poll for results (up to 60s timeout)
- Images are stored as URLs/data-URLs in state; they won't persist across sessions unless you export the JSON
