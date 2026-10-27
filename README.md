# FrameScore
*Will your PC run it?*

## Running it locally
Requires Node.js 20+.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## How it works (current build)
- `src/data/gpus.ts`, `src/data/cpus.ts`: hand-tuned relative performance scores for ~350 parts (GTX 1060 = 100, i5-4590 = 100).
- `src/lib/steam.ts`: game search and details from Steam's public store API (no key needed), cached for a day.
- `src/lib/requirements.ts`: turns Steam's requirement HTML into structured parts, RAM, VRAM and storage; falls back to rough guesses for vague text like "2 GB DirectX 11 card".
- `src/lib/estimate.ts`: compares your parts to the requirements and produces the tier, fps range, bottleneck, advice and upgrade suggestion.
- Your hardware is saved in the browser (localStorage). There is no database yet; Supabase comes in once we need caching, accounts or the Steam library import.

## Tech stack
Next.js 15 (App Router) + TypeScript + Tailwind CSS 4. Supabase (Postgres) planned.

## What is it?
A web app where users search for a PC game, enter their hardware, and get a clear estimate of **how well** the game will run, plus specific advice to make it run better. If it won't run, the app suggests similar games that will.

## Why it's different
Existing tools (Can You Run It, PCGameBenchmark) mostly give a pass/fail against minimum and recommended specs, with dated interfaces. This app aims for:
- **Performance tiers, not pass/fail:** an estimated quality level and rough fps, with a confidence level.
- **Actionable fixes:** settings tweaks, upscaling (DLSS / FSR / XeSS), and the cheapest upgrade that would make a real difference.
- **A modern, fast, good-looking UI.**

## Core features (MVP)
1. **Game search:** autocomplete search over Steam games.
2. **Hardware input:** GPU, CPU and RAM fields with autocomplete.
   - Auto-detect where the browser allows (GPU via WebGL, approximate RAM, CPU core count), pre-filled and editable.
   - Laptop and desktop GPU variants listed separately; integrated graphics supported.
3. **Verdict:** one of *Won't run → Low → Medium → High → Ultra*, with an estimated fps range at 1080p and a confidence level. Clearly labelled as an estimate.
4. **Bottleneck and advice:** names the weakest part and gives 1–2 concrete fixes (lower settings, enable upscaling, update drivers, add RAM, etc.).
5. **Extra checks:** VRAM, storage type (SSD required?), and OS compatibility.

## Later
- **My Rig profile:** save hardware once; every game page shows a verdict immediately.
- **Upgrade advisor:** "A used RX 6600 (~$150) gets you to High." Possible affiliate revenue.
- **Alternatives:** if a game won't run, suggest games with matching Steam tags that do.
- **Steam library import:** check every game a user owns at once.
- **Linux / Steam Deck:** compatibility via ProtonDB data.
- **Prebuilt PC / laptop model lookup:** map model names to their parts.

## Out of scope for now
- Non-Steam storefronts
- Consoles and mobile
- Measured (rather than estimated) benchmarks

## Data (the hard part)
| Need | Source | Notes |
|---|---|---|
| Game requirements | Steam Store API | Returned as unstructured HTML ("GTX 970 or AMD equivalent"); needs a parser to normalise into structured parts. |
| Game metadata (tags, genres, images) | Steam Store API | Used for search and alternatives. |
| GPU / CPU performance scores | Benchmark databases (e.g. PassMark) | **Check licensing** before use. Needed to compare any part against any other. |
| Linux / Deck compatibility | ProtonDB | Later phase. |

**Estimation approach:** start simple: compare the user's part scores to the game's recommended-spec scores to pick a tier. Refine over time with real benchmark data.

## Design
- Near-black dark theme (around `#0a0a0a`) by default, with an optional true-black (`#000`) mode for OLED screens.
- Clean, minimal UX: search → hardware → verdict in as few steps as possible.
- Responsive (mobile-first) with smooth, subtle transitions.
- The verdict should be readable at a glance: big tier label, then details below.

## Open questions
- Domain for the FrameScore name
- Hosting (Vercel is the natural fit for Next.js)
- Replacing hand-tuned hardware scores with a licensed benchmark source
- How often to refresh game and hardware data
