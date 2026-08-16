# easel

A local, git-backed slide library. Slides are React components. Decks are JSON manifests that point at them. Headless Chromium renders a deck to a 1920×1080 PDF.

It's built for one workflow: **clone the repo, point your AI coding agent at it, and let it author slides and assemble decks with you.** No backend. No DB. No accounts. The repo is the source of truth.

## Clone and rip

```bash
git clone <this-repo>
cd easel
npm install
npx playwright install chromium    # one-time, ~90MB
npm run dev                         # http://localhost:5173
```

That's the entire setup. You should see the existing decks and a folder tree of shared slides in the sidebar.

If you have Claude Code (or any agent that can edit files and run shell commands), it can read [`CLAUDE.md`](./CLAUDE.md) and start authoring slides immediately. The CLI listed below is the agent's API.

## What you get

- A **slide library** organized by folder, mirroring disk structure. Reusable slides live in `slides/`. One-offs that belong to a single deck live alongside it.
- A **deck format** that's just JSON. Each deck is `decks/<name>/deck.json` with a `title` and an ordered list of slide paths.
- A **viewer** that renders any deck like Docsend (black backdrop, auto-hiding chrome, ←/→ keys, fullscreen, slide strip).
- A **PDF exporter** that bakes any deck into a real 1920×1080 PDF via headless Chromium.
- A **CLI surface** for authoring — every operation a teammate (or an agent) would want.

## Mental model

```
slides/                       reusable, shared with the team
  shared/
    examples/title.tsx        a React component, returns <Slide>...</Slide>
    examples/chart.tsx
decks/
  example/
    deck.json                 { title, slides: ["slides/...", "decks/..."] }
    slides/
      thanks.tsx              this slide belongs to only this deck
schemas/deck.schema.json      JSON Schema for editor autocomplete
exports/                      PDFs land here (gitignored)
scripts/                      the CLI surface (below)
```

Slides are **referenced by full path from project root** — unambiguous, greppable, matches what's on disk.

Each slide is a default-exported React component that wraps its content in `<Slide>`:

```tsx
import { Slide } from '@/components/Slide'

export const meta = { title: 'Quarterly growth', tags: ['data'] }
export const notes = 'Optional speaker notes.'

export default function Chart() {
  return (
    <Slide>
      <div style={{ padding: 120 }}>
        <h2 style={{ fontSize: 56, margin: 0 }}>Quarterly growth</h2>
        {/* render any React you want; the canvas is 1920×1080 */}
      </div>
    </Slide>
  )
}
```

The `<Slide>` wrapper enforces 1920×1080 — fit-to-viewport in the preview, native size in the PDF.

**Portrait slides.** Add `orientation: 'portrait'` to a slide's `meta` to make it a **US Letter** (8.5×11) page — the standard Word/print size. That single field controls the viewer, the thumbnail, and the PDF page size; you design on a 1632×2112 canvas and it exports to a true 8.5×11in PDF page. A deck can mix landscape and portrait freely. (`npm run new:slide -- … --portrait` scaffolds one for you.)

## The CLI

This is the surface your agent will drive.

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR. |
| `npm run build` | Type-check + production build. |
| `npm run new:deck -- <name> [--title "…"]` | Scaffold a new deck. |
| `npm run new:slide -- <path> [--portrait]` | Create a shared slide at `slides/<path>.tsx`. `--portrait` for a 1080×1920 slide. |
| `npm run new:slide -- --deck <name> <path> [--portrait]` | Create a deck-local slide. |
| `npm run edit:deck -- <name> [--title …] [--description …] [--author …]` | Update deck metadata. |
| `npm run add:slide -- <deck> <slide-path> [--at <pos>]` | Add a slide to a deck. `<pos>` is 1-based. |
| `npm run remove:slide -- <deck> <pos-or-path>` | Remove a slide from a manifest. (Does not delete the file.) |
| `npm run move:slide -- <deck> <from> <to>` | Reorder. `<to>` is 1-based, `start`, or `end`. |
| `npm run export -- <deck> [--out file.pdf] [--no-build]` | Build a PDF. |
| `npm run publish -- <deck> [--yes]` | Deploy the deck to Cloudflare Pages. Returns a public `*.pages.dev` URL. Records it in `.easel/published.json`. |
| `npm run unpublish -- <deck> [--yes]` | Delete the deck's CF project and take the URL offline. |

Every script exits non-zero with a useful message on failure.

## End-to-end example

```bash
# Create a deck
npm run new:deck -- q3-review --title "Q3 review" --author "Your Name"

# Reuse the bundled title slide + write a few new ones
npm run add:slide -- q3-review slides/shared/examples/title.tsx

npm run new:slide -- --deck q3-review highlights --title "Q3 Highlights"
npm run add:slide -- q3-review decks/q3-review/slides/highlights.tsx

npm run new:slide -- --deck q3-review whats-next
npm run add:slide -- q3-review decks/q3-review/slides/whats-next.tsx

# Open the dev server, edit the slides until they look right
npm run dev

# Export
npm run export -- q3-review
# → exports/q3-review.pdf
```

Or just tell your agent: *"Make me a 6-slide Q3 review deck with a title slide, three highlights, an upcoming roadmap slide, and a thanks closer."* It has [`CLAUDE.md`](./CLAUDE.md) — it knows what to do.

## Viewer keys

While viewing a deck (`/decks/<name>`):

| Key | Action |
|---|---|
| `→` `Space` `PgDn` `j` `l` | Next slide |
| `←` `PgUp` `k` `h` | Previous slide |
| `1`–`9`, `0` | Jump to slide N |
| `Home` / `End` | First / last |
| `F` | Fullscreen |
| `S` | Toggle slide strip |
| `Esc` | Exit fullscreen, then exit viewer |

Click zones on the left/right 18% of the slide also navigate prev/next.

## Publishing a deck

```bash
# First-time setup: create a (free) Cloudflare account, then
npx wrangler login

# Optional but recommended: set a unique projectPrefix in .easel/config.json
# (e.g. your username or company name) so your URLs don't collide with anyone else's.

# Publish:
npm run publish -- q3-review
# → https://easel-q3-review.pages.dev (or with your custom prefix)
```

The URL is public — anyone who has it can view. Pages.dev URLs aren't indexed unless you link them, but they aren't authenticated either. For confidential decks, send the PDF instead until we add auth.

If the project name is already taken on Cloudflare (the `*.pages.dev` namespace is shared), the script auto-appends a random 4-char suffix and remembers it. Re-running `publish` for the same deck always hits the same URL.

`.easel/published.json` tracks what's live. The UI surfaces a "Live" badge on the deck card linking to the URL — anyone who pulls the repo sees it.

`npm run unpublish -- <deck>` deletes the CF project and removes the entry.

## Why local-first

The repo is the slide library. Forever. When you `git pull`, you get the team's slides. When you make new ones, you commit them. When you want to look at the deck Alice made last quarter, you `git log` her commits.

This isn't a SaaS. It's a developer tool. Slides compound in value over time the same way a design system does — and the same way code does. You own them. Publishing is a thin layer on top — static files pushed to a CDN — not a backend you depend on.

## How export actually works

`npm run export` does:

1. `vite build` (skippable with `--no-build`)
2. Boots `vite preview` on an ephemeral port
3. Launches headless Chromium via Playwright, navigates to `/print/<deck>`
4. Waits for `window.__SLIDES_READY` (set once every slide module loads and fonts settle)
5. `page.pdf({ width: '1920px', height: '1080px', printBackground: true })`
6. Tears down preview + browser, writes to `exports/<deck>.pdf`

Each slide renders inside a `print-page` div with `page-break-after: always`. One slide per page, native resolution.

**From the viewer.** The deck viewer has an **Export** button next to Slides / Edit / Fullscreen. It opens a native Save dialog so you choose the destination, then runs the exact pipeline above and writes the PDF there — byte-identical to the CLI output.

It works during `npm run dev` only. The app has no backend, so the export runs in Vite dev-server middleware (`vite.config.ts`) that shells out to `scripts/export-pdf.mjs`. Built output has no such endpoint, so the button is compiled out.

The Save dialog uses the File System Access API (Chrome/Edge). Elsewhere the PDF lands in your normal downloads folder instead.

## Stack

Vite + React 18 + TypeScript + React Router. Playwright for PDF. No CSS framework — design tokens are in `src/styles.css`. Source Serif 4 / Inter / JetBrains Mono via Google Fonts.

## What's intentionally not here

- A backend. No DB. No auth. No multi-tenancy. The repo is the storage layer.
- A WYSIWYG editor. Slides are code.
- Themes/transitions. Slides are React — write your own.
- Drag-to-reorder in the edit view. Use `npm run move:slide`.
- Slide versioning. Use git.
- A hosted viewer. Use the PDF, or stay tuned for `publish`.

If your audience for these decks isn't technical, that's fine — they'll receive the PDF. The authoring workflow is for you (and your agent).
