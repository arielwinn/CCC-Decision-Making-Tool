# CCC Entrustment Decision Tool

A local-first web app that walks a Clinical Competency Committee through an entrustment-level decision for General Pediatrics EPAs. Teaches committee members what each entrustment level means as they work through decisions, documents the reasoning for every call, and exports the result as an Excel dataset that can be reused in future cycles.

> Built to make the committee's reasoning **visible, teachable, and transferable** — the committee's best thinking is most useful when it reaches the learner.

## What it does

- **Centers the committee on the learner and future patients** before opening any data.
- Walks the committee through a **single decision per screen** — no crowded dashboards.
- Teaches what each Chen-scale entrustment level (1, 2A/2B, 3A/3B, 4, 5) actually means as the committee decides, then hides the teaching once the reviewer has proved competence via a knowledge check.
- **Actively affirms Level 5** on the "Yes" path (you click; nothing is pre-filled) with a required shared rationale when affirming multiple EPAs.
- **Flags EPAs for deep-dive review** so concerns from the pre-review step surface as callouts during the walkthrough.
- **Captures cross-cutting themes** (strengths that make care safe & effective, growth areas that currently prevent it) and pins them to every EPA screen.
- **Celebrates Level 5** as the start of autonomy and targeted learning — not a finish line.
- **Finalizes each cycle** and saves a snapshot to browser storage; next time the same trainee is reviewed, prior cycles appear as context.
- Exports to **Excel, PDF, or clipboard** in a clean, structured, reusable format.
- **Badge system with localStorage persistence** — reviewers earn Practice-Ready and Streamline badges by passing short quizzes; teaching content collapses once badges are earned so experienced reviewers move faster.
- **All data is local.** Nothing is uploaded to any server. Works on a laptop in a meeting room with zero network dependency after initial load.

## Tech stack

- [Vite](https://vitejs.dev/) + React (JavaScript, no TypeScript)
- [SheetJS (`xlsx`)](https://docs.sheetjs.com/) for Excel export
- [jsPDF](https://github.com/parallax/jsPDF) for PDF export
- Plain CSS with custom properties — no CSS framework
- Fraunces (serif) + Inter (sans) from Google Fonts

## Getting started

Prerequisites: Node.js 18+ and npm.

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173/`).

## Building for deployment

```bash
npm run build
```

The built static site is written to `dist/`. It is fully static — drop it on any static host.

### One-click hosting with Netlify Drop

1. Run `npm run build`
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag the `dist/` folder onto the drop zone
4. Share the public URL

No accounts required.

### Alternatives

- **Vercel** — import the repo, no config needed
- **GitHub Pages** — add a Pages workflow and point it at `dist/`
- **Any S3 / Cloudflare Pages / static host** — upload `dist/`

## Data & privacy

**Nothing leaves the user's browser.**

- The current assessment lives in React state (lost on tab close).
- Earned badges and finalized cycles are stored in `localStorage` — isolated to each browser.
- Exports (Excel, PDF, clipboard) are generated entirely client-side.
- There is no backend, no analytics, no tracking.

If the tool is shared via a public URL, every user starts from a clean session. Privacy is a design property, not a promise.

## Customizing for your program

All General Pediatrics EPA names and descriptors live in `src/data.js`. To adapt this for another specialty:

1. Edit `EPAS` in `src/data.js` — replace the 12 EPA entries with your specialty's EPAs (keep the `id`, `name`, `short` shape).
2. Keep `LEVELS` unchanged — the Chen-scale descriptors are specialty-agnostic.
3. Replace the text in `framingQuestion` if your program phrases entrustment differently.
4. Review the teaching content in `src/App.jsx` — the EBM parallel, the framing reminders, and the celebratory copy on Level 5 — to match your program's voice.

## Project structure

```
src/
├── data.js         # EPAs, entrustment levels, framing question text
├── App.jsx         # Single-file React app (all components inline — easy to read and modify)
├── App.css         # All styling
├── index.css       # Font imports + resets
└── main.jsx        # Entry point
```

One-file structure is intentional. The whole assessment flow is readable top-to-bottom without jumping between files.

## Contributing / forking

This repo is intended as a **template**. Forks are encouraged. If you build an adapted version for another specialty or another entrustment scale, open an issue with a link — these tools are more useful when they're shared and remixed.

## Philosophy

This tool is opinionated. It believes:

- **The bar is safe and effective care**, not expertise or perfection.
- **Help-seeking is a core safety skill**, not a sign of weakness.
- **The committee's reasoning is the product** — the level number is just the header.
- **Committee decisions are most useful when reviewed with the resident and their coach.**
- **The decision is a trajectory, not a point estimate.** Prior-cycle data should be weighed in, and new data may change the call.
- **CCC decisions parallel evidence-based medicine**: no single test gives the truth. You make an informed judgment based on available data with a transparent, documented thought process.

## License

MIT. See [LICENSE](./LICENSE).
