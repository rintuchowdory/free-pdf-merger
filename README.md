# Free PDF Tools

Free, private PDF tools that run **entirely in your browser** — no uploads, no sign-up, no watermarks.

Live at: https://rintuchowdory.github.io/free-pdf-merger/

## Tools

| Tool | What it does |
| --- | --- |
| **Merge PDF** | Combine multiple PDFs into one document, with drag-free reordering. |
| **Photos to PDF** 🆕 | Turn JPG / PNG / WebP / GIF / BMP photos into a single PDF — one page per photo, with A4/Letter sizing, orientation and margins. |
| **Compress PDF** | Reduce PDF file size while keeping it readable. |
| **Split PDF** | Extract page ranges or split a PDF into single-page files. |
| **PDF to Images** | Render every PDF page as a real PNG (powered by PDF.js) and download as ZIP. |

## Highlights

- **Dashboard-style UI** with light & dark mode
- **100% private** — files are processed locally with pdf-lib / PDF.js and never uploaded
- Works offline after first load (static site, no backend)

## Tech

React 18 · TypeScript · Vite · Tailwind CSS v4 · pdf-lib · PDF.js · JSZip

## Development

```bash
pnpm install
BASE_PATH=/ PORT=5173 pnpm dev      # local dev
BASE_PATH=/ PORT=5173 pnpm build    # production build → dist/public
```

Deployed via the `gh-pages` branch (built output), served by GitHub Pages.
