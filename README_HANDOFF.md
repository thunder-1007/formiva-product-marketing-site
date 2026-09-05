# Formiva public marketing website

A Vercel-ready React + Vite marketing website for **Formiva**, a product of **Vishyx Techie**.

## Run locally

```bash
pnpm install
pnpm dev
```

## Production build

```bash
pnpm build
```

The production files are generated in `dist/public`.

## Deploy to Vercel

1. Create a new Vercel project from this folder or upload the repository to GitHub and import it.
2. Keep the detected framework as Vite or use these values:
   - Build command: `pnpm build`
   - Output directory: `dist/public`
3. Deploy. The included `vercel.json` handles client-side route rewrites.

## Important

This is the **public product-introduction website only**, not the Formiva application UI. Login and signup are polished public UI previews. Their forms currently show a confirmation state and should be connected to Clerk or the production Formiva backend later.

## Main routes

- `/` — home
- `/company/*` — company pages
- `/product/*` — product and template pages
- `/solutions/*` — industry and workflow solutions
- `/resources/*` — guidelines, docs, brochures and testimonials
- `/blog` — journal landing page
- `/pricing` — pricing positioning page
- `/features` — feature page
- `/login` and `/signup` — authentication UI previews
- `/legal/privacy`, `/legal/terms`, `/legal/security` — legal placeholders for review

## Design system

- Dark control-room hero surfaces
- Electric lime primary accent
- Ultraviolet secondary accent
- Space Grotesk display typography
- Manrope body typography
- DM Mono system labels
- Reduced-motion support included

## Changelog — cleanup pass

**Security (do this first):** the original export contained a `.project-config.json` with live secrets (a JWT signing secret and two API keys) plus the owner's account ID. That file has been deleted from this project, but if it was ever committed to a git repo or pasted into Vercel's environment variables, **rotate those keys now** — deleting the file here does not invalidate them.

**Removed (AI build-tool artifacts):**
- `.manus/`, `.manus-logs/`, `.project-config.json`, `template.json`
- `client/public/__manus__/debug-collector.js` and the Vite plugin that served it
- `vite-plugin-manus-runtime` dependency and Manus-only dev-server hostnames
- `client/src/components/ManusDialog.tsx` (unused "Login with Manus" component)
- `@builder.io/vite-plugin-jsx-loc` (dev plugin that stamps source file/line data into the DOM)
- Two unused scaffold files (`pages/Home.tsx`, `pages/NotFound.tsx`) left over from the template
- The `%VITE_ANALYTICS_ENDPOINT%` script tag pointing at `manus-analytics.com`
- A leftover "TO BE DELETED" comment block in `index.html`
- `pnpm-lock.yaml` (now stale after the above; run `pnpm install` to regenerate)

**Added (SEO):**
- Meta description, canonical URL, Open Graph + Twitter card tags, and a JSON-LD `SoftwareApplication` block in `index.html`
- `favicon.svg` / `favicon.png` and a generated `og-image.png` for social shares
- `robots.txt` and `sitemap.xml` (update the domain in both if you move off the `.vercel.app` subdomain)
- Per-route `<title>` and meta description via a lightweight `useSeo` hook (no new dependency) — previously every route shared one title
- A real 404 page for unmatched routes (previously fell through to the Resources page)

**Pricing page:** `/pricing` now renders three real pricing cards (Starter / Vertical Pro / Governance) with price, feature list and CTA, styled in the site's own lime/violet palette instead of the reference screenshot's purple. **The `$299` figure is a placeholder** — edit `pricingTiers` in `client/src/App.tsx` with your real numbers before launch.

**Not changed:** the login/signup forms are still UI-only previews (no backend), as your own handoff notes already disclosed above — this isn't a bug, just something to wire up before launch.

