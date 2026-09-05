# Formiva public marketing website

A Vercel-ready React and Vite marketing website for **Formiva**, a product of **Vishyx Techie**.

## Run locally

```bash
pnpm install
pnpm dev
```

## Production checks

```bash
pnpm test
pnpm check
pnpm build
pnpm start
```

The production client files are generated in `dist/public`.

## Deploy to Vercel

1. Create a Vercel project from this folder or import its repository.
2. Use `pnpm build` as the build command and `dist/public` as the output directory.
3. Deploy. The included `vercel.json` handles client-side route rewrites.

## Important

This is the public product-introduction website only, not the Formiva application UI. Login and signup are UI previews and need a production authentication backend before they can be used for real accounts.

## Main routes

- `/` — home
- `/company/*` — company pages
- `/product/*` — product and template pages
- `/solutions/*` — industry and workflow solutions
- `/resources/*` — guidelines, docs, brochures and testimonials
- `/blog` — journal landing page
- `/pricing` — pricing positioning page
- `/features` — feature page
- `/login` and `/signup` — authentication previews
- `/legal/privacy`, `/legal/terms`, `/legal/security` — legal placeholders for review

## Design system

- Dark control-room hero surfaces
- Electric lime primary accent
- Ultraviolet secondary accent
- Space Grotesk display typography
- Manrope body typography
- DM Mono system labels
- Reduced-motion support included
