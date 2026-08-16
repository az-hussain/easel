# CLAUDE.md — operating notes for agents working in this repo

You are working in **gallery**, a local-first, git-backed slide library. Slides are React components. Decks are JSON manifests that reference slides by path. Everything is files; the CLI is the API. There is no backend, no DB, no cloud — and that is intentional.

This file teaches you the conventions you need to operate here productively without asking the user obvious questions.

---

## What you should know before doing anything

- **Slides live in two places.** Reusable ones in `slides/<…>.tsx`. Deck-specific one-offs in `decks/<deck-name>/slides/<…>.tsx`.
- **Decks are `decks/<name>/deck.json`.** The `slides` array is an ordered list of paths (from project root). That's the entire data model.
- **Slides are always 1920×1080.** The `<Slide>` wrapper enforces this. Don't hardcode other dimensions.
- **The CLI is how you mutate the manifest.** Don't write JSON by hand — use the scripts. They validate paths and keep formatting consistent.
- **You are not allowed to skip Playwright export.** When the user asks for a PDF, run `npm run export -- <deck>`. Don't fake it by stitching screenshots.

---

## The CLI surface (operate this repo with these)

These are the verbs you have. Use them — don't reach for raw file edits when a script exists for the task.

| Command | Purpose |
|---|---|
| `npm run new:deck -- <name> [--title "…"] [--description "…"] [--author "…"]` | Create a new deck. Name must be kebab-case. |
| `npm run new:slide -- <path> [--title "…"]` | Create a shared slide at `slides/<path>.tsx`. Path may include subfolders. |
| `npm run new:slide -- --deck <name> <path> [--title "…"]` | Create a deck-local slide at `decks/<name>/slides/<path>.tsx`. |
| `npm run add:slide -- <deck> <slide-path> [--at <pos>]` | Append (or insert at 1-based position) a slide path to a deck's manifest. |
| `npm run remove:slide -- <deck> <pos-or-path>` | Remove a slide from a manifest. Does NOT delete the underlying file. |
| `npm run move:slide -- <deck> <from> <to>` | Reorder. `<to>` accepts a 1-based index, `start`, or `end`. |
| `npm run edit:deck -- <deck> [--title "…"] [--description "…"] [--author "…"] [--unset <field>]` | Update deck metadata. |
| `npm run export -- <deck> [--out file.pdf] [--no-build]` | Render the deck to PDF via headless Chromium. Pass `--no-build` if you've already built or are iterating fast. |
| `npm run publish -- <deck> [--yes] [--prefix <p>]` | Publish the deck to Cloudflare Pages as a static SPA. Returns a public URL. **External action — confirm with the user before running unless they explicitly asked for it.** |
| `npm run unpublish -- <deck> [--yes]` | Take a published deck offline by deleting its CF Pages project. **Destructive external action — always confirm with the user before running.** |
| `npm run dev` | Vite dev server with HMR at http://localhost:5173. |
| `npm run build` | Type-check + production build. |

Every script exits non-zero with a useful message on failure. Read stderr, don't guess.

---

## How to author a slide

Slides are React components. There is no special framework — anything that renders in React renders in a slide. The template:

```tsx
import { Slide } from '@/components/Slide'

export const meta = {
  title: 'Short title',         // shown in the gallery
  tags: ['intro', 'cover'],     // optional, used for future search
  orientation: 'portrait',      // optional — 'landscape' (default) or 'portrait' (US Letter)
}

export const notes = 'Optional speaker notes.'

export default function MySlide() {
  return (
    <Slide>
      {/* Your content. The canvas is 1920×1080. */}
      <div style={{ padding: 120 }}>
        <h1 style={{ fontSize: 96, margin: 0 }}>Headline</h1>
      </div>
    </Slide>
  )
}
```

**Design tokens are in `src/styles.css`.** When you build a slide, prefer the existing palette and type stack over inventing new colors:

- Primary font: `var(--font-display)` for big serif headlines (Source Serif 4), `var(--font-ui)` for UI text (Inter), `var(--font-mono)` for code/paths.
- Surfaces: `var(--bg)` `var(--bg-1)` `var(--bg-2)` `var(--bg-3)` (escalating elevation).
- Text: `var(--text)` `var(--text-2)` `var(--text-3)` (escalating dim).
- Accent: `var(--accent)` (indigo). Use sparingly — one accent element per slide max.

**Orientation (landscape vs portrait).** Slides are landscape (1920×1080, 16:9) by default. To make a single slide portrait, set `orientation: 'portrait'` in its `meta` — that one field drives everything: the canvas size in the viewer, the gallery thumbnail, and the PDF page size. Don't pass dimensions to `<Slide>` by hand. The scaffolder has a shortcut: `npm run new:slide -- --deck <name> <path> --portrait`.

Portrait is **US Letter** (8.5×11) — the standard Word/print page, *not* a flipped 16:9 slide. You author it on a 1632×2112 canvas (Letter at 192dpi, so the same 80px+ headline / 120–160px padding guidance applies), and the export scales it onto a true 8.5×11in PDF page (a standard 612×792pt Letter MediaBox). A deck can freely mix landscape and portrait — the exported PDF emits a correctly-sized page per slide. This relies on named CSS `@page` rules + `preferCSSPageSize` and the print-mode scale in `Slide.tsx`, so don't touch the print CSS, the `SPECS` map, or `page.pdf()` options without re-testing a mixed deck. Letter is the only portrait size for now.

**Heuristics for good slides:**

1. **One idea per slide.** If it has two headlines, it's two slides.
2. **Massive type.** Headlines start at 80px+. Body text 24-32px. Never below 18px.
3. **Generous padding.** 120-160px on the sides. Slides are big — fill them with air, not text.
4. **Use SVG for data.** No chart library. Hand-rolled SVG is more flexible and renders cleanly to PDF.
5. **Avoid stock photos.** If the user wants imagery, ask what they have. Don't invent URLs.
6. **Test the PDF.** If you authored a slide, run `npm run export -- <deck-it's-in>` and check the output looks right.

---

## Shared vs deck-local — when to pick which

- **Shared (`slides/...`)** when the slide is reusable across decks. Examples: a title-slide template, a generic company-overview slide, a chart with placeholder values others can copy.
- **Deck-local (`decks/<name>/slides/...`)** when the slide is bound to a single narrative — references this deck's data, sits at a specific spot in this deck's story, won't be useful elsewhere.

**Heuristic:** if you'd be embarrassed for this slide to show up unannounced in another deck, make it deck-local.

A slide that's local can be "promoted" to shared by `git mv`-ing the file from `decks/<name>/slides/` to `slides/...` and updating the path in the manifest with `add:slide` (after `remove:slide`-ing the old one). There's no special command yet; it's a 2-step.

---

## How to think about a deck

A deck is a story. The manifest is its outline. When the user asks you to build a deck:

1. **Ask what the story is** if it isn't obvious. "Q3 review for the board" is enough; "make me a deck" is not.
2. **Sketch the slide list in plain text first.** Talk through the arc before writing code. Five-to-eight bullets.
3. **Identify reuse.** Which slides already exist in `slides/`? Use them. Don't reinvent a title slide.
4. **Scaffold the deck and slides.** Use the CLI verbs. Create only the new slides you need.
5. **Build slides one at a time.** Stop and let the user see each before moving on, especially the first one — it sets the tone for the rest.
6. **Export and verify.** Don't claim a deck is done until you've run `npm run export -- <name>` and confirmed the PDF looks right.

---

## Publishing a deck (sharing via URL)

`npm run publish -- <deck>` deploys a deck as a self-contained static SPA on **Cloudflare Pages**. Each deck gets its own subdomain (`<prefix>-<deck>.pages.dev`). The published page is the deck viewer only — no sidebar, no editing.

What you need to know:

- **Publishing is an external action.** Don't run it without the user's explicit instruction. Confirm the deck name and that they want it public before executing.
- **First-time setup is one command.** If the user has never published, they need `npx wrangler login` once. Surface this if `wrangler whoami` fails.
- **pages.dev URLs are public.** No auth. Don't publish anything sensitive without telling the user that anyone with the link can see it.
- **Published state is tracked in `.gallery/published.json`.** This file is committed to git. The act of publishing updates it; the user commits when ready.
- **A "Live" badge appears in the UI** on decks that have been published. Clicking it opens the URL.

The exact URL is determined by `<projectPrefix>-<deck>` where the prefix is from `.gallery/config.json` (default `gallery`). The user can override per-call with `--prefix foo`.

**Subdomain collisions.** `*.pages.dev` is a global namespace across all Cloudflare users. If `<prefix>-<deck>` is already taken by someone else, the script automatically appends a 4-char random suffix (e.g. `gallery-foo-x4f9.pages.dev`) and saves the actual project name in `published.json`. To minimize collisions, the user should set a distinctive `projectPrefix` in `.gallery/config.json` — their company name or username works well. If the user mentions URL collisions or wants a custom URL, point them at that file.

**Taking a deck offline:** `npm run unpublish -- <deck>` deletes the CF project and removes the entry from `published.json`. The URL stops resolving immediately. Always confirm with the user before running — once deleted, the project name becomes available globally again (anyone could claim it).

## What this app is NOT

Save the user from misunderstanding. If they ask about any of these, gently correct them:

- **Not a SaaS.** No accounts, no DB, no backend. The repo is the storage layer; the CLI is the API. Publishing pushes static files to Cloudflare Pages — no server running on our side.
- **Not WYSIWYG.** Slides are code. They're authored in `.tsx`, not in a drag-and-drop editor.
- **Not multiplayer.** Two people editing the same `deck.json` will hit a git merge conflict. That's normal git, not a bug.
- **Not a chart/diagram library.** Use SVG, or import whatever they want. There's no special primitive for charts.
- **Published decks are not authenticated.** Anyone with the URL can view. If the user needs real auth on a published deck, surface this — it's a future feature (Cloudflare Access).

---

## Files to NOT touch unless explicitly asked

- `src/components/Slide.tsx` — the canvas wrapper. Changes here affect every slide and the PDF export.
- `scripts/export-pdf.mjs` — the Playwright pipeline. Tightly coupled to the print route.
- `src/routes/PrintView.tsx` — the print route. Must keep setting `window.__SLIDES_READY` after fonts and slides load, or export breaks.
- `schemas/deck.schema.json` — the JSON Schema. If you change it, update the CLI validators in `scripts/_util.mjs` and the README.

---

## Quick reference: where things live

```
slides/                  Shared, reusable slides
  shared/                  (the only convention — feel free to add other top-level folders)
decks/
  <name>/
    deck.json              Manifest (title, slides[], metadata)
    slides/                Deck-local one-offs
exports/                 PDF output (gitignored)
schemas/deck.schema.json JSON Schema for deck manifests
scripts/                 The CLI you use
src/                     The web app
  components/Slide.tsx   The 1920×1080 canvas wrapper
  routes/                Pages
  lib/                   Slide registry, deck loader, folder tree
```

---

## When in doubt

- The user wants slides that look polished. Not generic. Spend the typography/whitespace budget.
- The user wants you to drive the CLI, not narrate it. Run the scripts; report results.
- The user is technical. Don't over-explain git or npm. Do explain repo-specific conventions.
- If you've broken something or the export fails, **stop and surface it.** Don't pretend the artifact is fine.
