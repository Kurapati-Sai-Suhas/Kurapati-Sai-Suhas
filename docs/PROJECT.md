# Cricket Profile README — project documentation

A GitHub profile README rendered as a floodlit night cricket match. Eleven animated SVG
scenes, generated from live GitHub API data by a zero-dependency Node renderer and
refreshed on a schedule by GitHub Actions.

---

## Contents

1. [How it works](#how-it-works)
2. [Quick start](#quick-start)
3. [Folder structure](#folder-structure)
4. [The scenes](#the-scenes)
5. [Data model](#data-model)
6. [Design system](#design-system)
7. [Constraints that shaped the code](#constraints-that-shaped-the-code)
8. [Performance](#performance)
9. [Accessibility](#accessibility)
10. [Extending it](#extending-it)
11. [Troubleshooting](#troubleshooting)

---

## How it works

```
config.json ────┐
                ├──> src/github/client.mjs ──> raw payload ──┐
GITHUB_TOKEN ───┘         (GraphQL + REST)        │           │
                                                  │           ├──> src/data/metrics.mjs
                                        .cache/github.json    │         (cricket mapping)
                                          (offline re-render) │           │
                                                              │           ├──> src/data/commentary.mjs
                                                              │           │
                                                              └───────────┤
                                                                          v
                                        src/render/components/*.mjs ──> assets/generated/*.svg
                                        src/render/readme.mjs       ──> README.md
```

Three ideas carry the whole design:

**Everything is derived.** `metrics.mjs` is a pure function from the API response to a
cricket scorecard. There is no branch that substitutes an example value when a fetch
fails — the build exits non-zero instead. `assets/generated/metrics.json` is written on
every run so the claim is checkable.

**Every scene is a module.** A scene exports `file` and `render(metrics, config)` and
returns a complete SVG string. Adding one is a new file plus one line in
`src/index.mjs`. Nothing else in the pipeline needs to know it exists.

**The renderer owns its own font.** GitHub proxies README images through Camo, which
strips scripts and blocks external resources — including webfonts. A retro pixel look
therefore cannot use Press Start 2P or anything like it. `pixel-font.mjs` ships a 5×7
bitmap font and emits glyphs as vectors, so headings are pixel-exact everywhere with
zero network cost.

### Two kinds of "live"

| | Refresh cadence |
| :-- | :-- |
| **Locally rendered scenes** (`assets/generated/*.svg`) | Rebuilt by the Action every six hours, on push, or on demand. |
| **Third-party widgets** (stats card, streak, activity graph, visitor counter, shields) | Rendered by the upstream service on every page view. |

Both are real. The second class fills the gap between scheduled builds, which is why the
README embeds both rather than picking one.

---

## Quick start

**Prerequisites:** Node 20 or newer. No `npm install` — there are no dependencies.

```bash
npm run setup -- --user your-github-username --name "YOUR NAME" --cap 404
```

Then edit `config.json` to declare your bowling arsenal, kit bag, certifications and
goals (see [CONFIG.md](CONFIG.md)), and build:

```bash
GH_TOKEN=ghp_xxx npm run build
```

Commit `README.md` and `assets/generated/` and push to a repository named exactly after
your username — that is what GitHub renders on your profile page.

### Commands

| Command | Purpose |
| :-- | :-- |
| `npm run build` | Fetch live data, render every scene, write `README.md`. |
| `npm run build:offline` | Re-render from `.cache/github.json`. For iterating on design without burning API quota. |
| `node src/index.mjs --dry` | Render and report sizes; write nothing. |
| `node src/index.mjs --user someone` | Build against a different account without editing config. |
| `npm run check` | Syntax-check the entry point and lint the generated assets. |

### Token

The Action's built-in `GITHUB_TOKEN` reads everything public, which covers every figure
on the board. To include **private** contributions in your totals, mint a classic PAT
with `read:user` (add `repo` for private repository stats), store it as the repository
secret `PROFILE_TOKEN`, and the workflow prefers it automatically.

---

## Folder structure

```
.
├── README.md                     ← GENERATED. The profile itself.
├── config.json                   ← The only file you normally edit.
├── package.json
│
├── .github/workflows/
│   └── update-readme.yml         Scheduled + on-push rebuild, commits the result.
│
├── src/
│   ├── index.mjs                 Orchestrator: flags, pipeline, write, report.
│   ├── config.mjs                Load + strict validation of config.json.
│   │
│   ├── github/
│   │   ├── queries.mjs           GraphQL documents, kept as auditable strings.
│   │   └── client.mjs            The ONLY module that touches the network.
│   │
│   ├── data/
│   │   ├── metrics.mjs           GitHub payload -> cricket scorecard (pure).
│   │   └── commentary.mjs        Commentary lines generated from those metrics.
│   │
│   └── render/
│       ├── theme.mjs             Colour, layout and motion tokens. Re-skin here.
│       ├── pixel-font.mjs        5x7 bitmap font + per-document glyph atlas.
│       ├── sprites.mjs           Original pixel characters and props.
│       ├── svg.mjs               Primitives: panel, meter, sprite, crowd, floodlight.
│       ├── readme.mjs            Markdown assembly.
│       └── components/           One module per scene.
│           ├── hero.mjs
│           ├── scoreboard.mjs
│           ├── player-card.mjs
│           ├── batting.mjs
│           ├── bowling.mjs
│           ├── kit.mjs
│           ├── fixtures.mjs      Emits one SVG per card (see below).
│           ├── trophies.mjs
│           ├── pitchmap.mjs
│           ├── commentary.mjs
│           └── footer.mjs
│
├── scripts/
│   ├── setup.mjs                 One-time config stamping.
│   └── lint-assets.mjs           Guardrails for the generated SVGs.
│
├── assets/generated/             GENERATED, and committed on purpose.
│   ├── *.svg
│   └── metrics.json              Exactly what was rendered, for verification.
│
└── docs/
    ├── PROJECT.md                This file.
    ├── CONFIG.md                 Every configuration key.
    └── config.schema.json        JSON Schema for editor autocomplete.
```

---

## The scenes

| # | Scene | File | What it shows |
| :-- | :-- | :-- | :-- |
| 1 | Hero | `hero.svg` | Night stadium, full house, floodlights, both characters, a looping delivery. |
| 2 | Live scoreboard | `scoreboard.svg` | Contributions / merges as TOTAL, run rate, strike rate, six live cells. |
| 3 | Player statistics | `player-card.svg` | Career record: batting and bowling columns on a scorecard grid. |
| 4 | Batting skills | `batting.svg` | Languages as strokes — a wagon wheel plus ranked power meters. |
| 5 | Bowling arsenal | `bowling.svg` | Backend / DevOps / AI / cloud, with measured wickets, overs and pace. |
| 6 | Kit bag | `kit.svg` | The stack as four equipment compartments, with real usage counts. |
| 7 | Fixtures | `fixture-N.svg` | Featured repositories as clickable match cards. |
| 8 | Trophy cabinet | `trophies.svg` | Declared certifications (gold) and API-proven milestones (blue). |
| 9 | The square | `pitchmap.svg` | Twelve months of contributions laid out on the turf. |
| 10 | Commentary | `commentary.svg` | Lines generated from your numbers, rotating daily. |
| 11 | Stumps | `footer.svg` | Match situation, the chase (your goals), sign-off. |

**Why fixtures are one file per card.** Anchors inside an SVG are inert once GitHub
serves it through Camo as an `<img>` — an in-SVG `<a>` would look clickable and do
nothing. Emitting a card per file lets `readme.mjs` wrap each in a markdown link, so the
cards genuinely navigate to the repository.

---

## Data model

`metrics.mjs` documents each mapping inline; the summary table is reproduced in the
generated README under *How to read the scorecard*.

| Cricket | Developer metric | API source |
| :-- | :-- | :-- |
| Runs | Commit contributions | `contributionsCollection.totalCommitContributions` |
| Innings | Days with ≥1 contribution | contribution calendar |
| Matches | Repositories contributed to | `totalRepositoryContributions` |
| Highest score | Busiest single day | contribution calendar |
| Average | Runs ÷ innings | derived |
| Strike rate | Runs per 100 days since debut | derived |
| Centuries / fifties | Calendar months over 100 / at 50–99 | derived |
| Fours | Pull requests opened | `pullRequests.totalCount` |
| Sixes | Releases published | `releases.totalCount` |
| Not out | Current daily streak | contribution calendar |
| Overs | Pull requests reviewed | `totalPullRequestReviewContributions` |
| Wickets | Pull requests merged | `pullRequests(states: MERGED)` |
| Runs conceded | Issues opened | `issues.totalCount` |
| Catches | Issues closed | `issues(states: CLOSED)` |
| Five-fors | Repositories with 50+ of your commits | `history(author:)` |
| Pace (kph) | Commit workload for a technology, relative to your busiest | derived |

### How the arsenal and kit are verified

You declare a technology and a set of keywords. A repository counts as *using* it when
any keyword appears — on a word boundary — in its languages, topics, name or
description. Wickets are the matching repository count; overs are your own commits
inside them.

Nothing is taken on trust: a declared technology with no matches renders **dimmed with a
dash**. An honest arsenal beats a full one, and the dimming makes the difference
visible rather than hiding it.

### Streaks

Contribution calendars are padded out to the end of the current week, so the tail
contains dates that have not happened yet; those are trimmed before counting or the
streak walks off the end of the calendar. A blank *today* does not break the current
streak until tomorrow — the same grace period GitHub itself applies.

---

## Design system

All tokens live in `src/render/theme.mjs`. Changing the palette there re-skins every
scene.

| Role | Token | Hex |
| :-- | :-- | :-- |
| Sky / background | `night`, `nightDeep`, `navy` | `#050B1C` `#02060F` `#0A1A3C` |
| Jersey | `royal`, `royalBright`, `sky` | `#1B4FD8` `#2F74FF` `#5AC8FA` |
| Trim | `gold`, `saffron`, `green` | `#FFC93C` `#FF9933` `#138808` |
| Turf | `turf`, `turfLight`, `pitch` | `#0F4D2A` `#17683A` `#C9A56B` |

Scenes render on a dark stadium background, which reads correctly in **both** GitHub
light and dark themes — so there is no second set of light-mode assets to keep in sync.

**Determinism matters.** Crowd placement, star fields and flag pockets use a seeded PRNG
(`rng()` in `theme.mjs`). A scheduled build must produce byte-identical output when the
underlying data has not changed; otherwise every run commits a diff and floods the
history.

---

## Constraints that shaped the code

GitHub serves README images through the Camo proxy. Inside that sandbox:

| Constraint | Consequence in this codebase |
| :-- | :-- |
| `<script>` is stripped | All animation is CSS keyframes and SMIL, declared inside the SVG. |
| No external resources | No CDN, no webfonts — hence the shipped bitmap font. |
| `<foreignObject>` does not render | No HTML-in-SVG layout; everything is positioned by hand. |
| Aggressive caching | Asset URLs carry a build stamp (`?v=…`), or a rebuild would be invisible. |
| `<a>` inside `<img>` is inert | Fixture cards are separate files wrapped in markdown links. |
| `<style>` is stripped from markdown | No styling in `README.md`; it all lives in the SVGs. |

`scripts/lint-assets.mjs` enforces these as build failures rather than leaving them as
folklore: it rejects scripts, event handlers, external references, `@font-face`,
`<foreignObject>`, missing `<title>`, animation without a reduced-motion escape hatch,
malformed XML and anything over budget.

---

## Performance

Two optimisations do nearly all the work, and both were driven by measurement — the
first hero render was **325 KB** and blew the per-file budget.

**Colour batching (`CellBatch`).** A `<rect>` with its attributes costs about 95 bytes;
the same cell as a subpath in a shared `<path>` costs about 18. Crowds and sprites are
accumulated and emitted as one path per colour. The hero crowd alone went from ~233 KB
to ~30 KB.

**Glyph atlas.** Pixel text was originally inlined as path data — roughly 2.4 KB for a
twelve-character run. Glyphs are now defined once per document in `<defs>` and
referenced with `<use>`, cutting the same run to ~350 bytes.

Current output, and the budgets the linter enforces:

| | Size | Budget |
| :-- | --: | --: |
| Largest scene (`hero.svg`) | ~60 KB | 220 KB |
| All scenes combined | ~285 KB | 900 KB |
| Build time (no dependencies to install) | ~20 s in CI | 10 min timeout |

Animation is restricted to `transform` and `opacity` — compositor-friendly properties
that do not force layout — and every scene keeps its concurrent animation count in
single figures.

---

## Accessibility

- Every scene has a `<title>` and a `<desc>`; the description carries the **actual
  numbers**, so a screen reader gets the scorecard rather than "image".
- Every stylesheet ends with a `prefers-reduced-motion: reduce` block that disables all
  animation. The linter fails the build if an animated scene omits it.
- Colour is never the only carrier of meaning: unused arsenal entries are dimmed *and*
  show a dash; live trophies are labelled `LIVE`, awarded ones `AWARDED`.
- The `alt` text on every `<img>` in the README restates the figures in prose.

---

## Extending it

**Add a scene.** Create `src/render/components/my-scene.mjs` exporting `file` and
`render(metrics, config)`, import it in `src/index.mjs`, add it to the `scenes` array,
and add a section in `src/render/readme.mjs`.

**Re-skin.** Edit `src/render/theme.mjs`. Every scene reads from it.

**New characters.** `src/render/sprites.mjs` holds string-art grids and a palette map.
`.` is transparent; every other character maps to a colour. Rows need not be equal
length. Keep new figures original — see the note at the top of that file.

**Change a stat mapping.** `src/data/metrics.mjs`. Keep the inline comment explaining
where the number comes from; that comment is what makes the metaphor honest, and the
table in `readme.mjs` should be updated to match.

---

## Troubleshooting

**`config.json → github.username is not set`**
Run `npm run setup -- --user <your-username>`. The build refuses to guess.

**`No GitHub token found`**
Set `GH_TOKEN` locally. In Actions this is provided automatically; if you see it there,
check that the `env:` block on the build step survived an edit.

**`No such GitHub user`**
The username in `config.json` does not resolve. Check spelling and case.

**Images do not update on the profile page**
Camo caching. The build stamps a `?v=…` query on every asset URL, so confirm the
generated `README.md` was committed and pushed — not just the SVGs.

**Images show as broken**
Run `npm run check`. The linter catches external references and malformed XML, the two
causes Camo will not tell you about.

**The arsenal is mostly dashes**
Working as designed — those technologies were not found in your public repositories.
Widen the `keywords` in `config.json`, or leave it honest.

**Scheduled builds do not run**
GitHub disables scheduled workflows on repositories with no activity for 60 days, and
cron is best-effort under load. Trigger `Update profile README` manually from the
Actions tab to re-arm it.

---

## Licence

MIT. Fork it, re-skin it, change the sport.
