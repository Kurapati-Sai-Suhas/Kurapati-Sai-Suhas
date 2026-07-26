# Configuration reference

Everything you edit lives in `config.json`. Keys beginning `_comment_` are inline notes
and are ignored by the loader.

Validation is strict where correctness matters and forgiving where it does not: a
missing `tagline` falls back silently, a missing `username` fails the build. Errors name
the exact path (`config.json → bowling[1].deliveries[3]`) and say what to do about it.

---

## `github`

```json
"github": {
  "username": "octocat",
  "excludeRepos": ["dotfiles", "old-experiment"],
  "excludeLanguages": ["HTML", "CSS", "Jupyter Notebook"],
  "includeForks": false
}
```

| Key | Type | Default | Notes |
| :-- | :-- | :-- | :-- |
| `username` | string | **required** | Whose data to fetch. The build refuses to run on the placeholder. |
| `excludeRepos` | string[] | `[]` | Repository names to leave out of every calculation. Case-insensitive. |
| `excludeLanguages` | string[] | `[]` | Kept out of the batting wagon wheel. Markup and config languages otherwise drown out what you actually write. |
| `includeForks` | boolean | `false` | Forks are excluded by default; they inflate counts without representing work. |

---

## `player`

Presentation only — none of this affects a statistic.

```json
"player": {
  "displayName": "SUHAS",
  "capNumber": "404",
  "role": "FULL-STACK ALL-ROUNDER",
  "tagline": "BUILDS UNDER LIGHTS. SHIPS UNDER PRESSURE.",
  "homeGround": "INDIA",
  "socials": { "linkedin": "", "twitter": "", "website": "", "email": "" }
}
```

| Key | Notes |
| :-- | :-- |
| `displayName` | Rendered in the hero. Falls back to your GitHub name, then your login. Keep it under 16 characters — the title auto-scales down beyond that, and past ~20 it gets small. |
| `capNumber` | Any string. `404` and `500` are the two characters' numbers. |
| `role` | One line under the title. |
| `tagline` | One line under that. Around 46 characters fits comfortably. |
| `homeGround` | Venue caption. Falls back to your GitHub location. |
| `socials` | Only the filled-in ones render as badges. Empty strings are skipped. |

---

## `bowling` — the arsenal

Grouped by category; four groups render (backend, DevOps, AI, cloud by convention, but
the labels are yours). Up to five deliveries per group are drawn.

```json
{
  "category": "DEVOPS",
  "deliveries": [
    { "name": "Kubernetes", "keywords": ["kubernetes", "k8s", "helm", "kustomize"] }
  ]
}
```

| Key | Notes |
| :-- | :-- |
| `category` | Panel heading. |
| `deliveries[].name` | **Required.** Keep to 12 characters or fewer; longer names are truncated. |
| `deliveries[].keywords` | **Required, non-empty.** This is what verifies the entry. |

**How keywords match.** A repository uses a technology when any keyword appears — on a
word boundary — in its languages, topics, name or description. The boundary check is why
`"go"` does not match `google`.

**Wickets** are the matching repository count. **Overs** are your own commits inside
them. **Pace** is a presentation of overs relative to your busiest delivery: a 118 kph
floor plus up to 42 kph, square-rooted so mid-range technologies do not flatten out.

A delivery with no matches renders dimmed with a dash. That is deliberate. If you want a
technology on the board, either widen its keywords or push code that uses it.

---

## `kit` — the kit bag

Same shape, different framing. Four compartments, up to five items each.

```json
{
  "piece": "THE GLOVES",
  "sub": "DATA",
  "items": [
    { "name": "PostgreSQL", "keywords": ["postgres", "postgresql"] }
  ]
}
```

| Key | Notes |
| :-- | :-- |
| `piece` | Compartment name. |
| `sub` | Small caption under it. |
| `items[].name` | **Required.** 11 characters or fewer renders cleanly. |
| `items[].keywords` | **Required, non-empty.** Matched exactly as above. |

Each item shows `×N`, the number of your repositories it appears in.

---

## `fixtures`

```json
"fixtures": { "mode": "auto", "count": 4, "pin": [] }
```

| Key | Type | Default | Notes |
| :-- | :-- | :-- | :-- |
| `mode` | `"auto"` \| `"manual"` | `"auto"` | `auto` ranks your repositories; `manual` uses `pin` in order. |
| `count` | 1–8 | `4` | Cards to render. Even numbers lay out best (2-up grid). |
| `pin` | string[] | `[]` | Repository names you own. Only read in `manual` mode. |

Auto-ranking weights stars ×3, forks ×2 and releases ×4, then applies a recency
multiplier so a long-abandoned hit cannot permanently block active work.

Card statistics are always fetched live regardless of mode.

---

## `trophies`

Certifications and awards — facts only you hold, so they are declared rather than
derived.

```json
"trophies": [
  { "title": "AWS SOLUTIONS ARCHITECT", "issuer": "AMAZON", "year": "2025", "url": "https://..." }
]
```

| Key | Notes |
| :-- | :-- |
| `title` | 18 characters or fewer renders cleanly; longer is truncated. |
| `issuer` | Small caption. |
| `year` | Optional. |
| `url` | Stored for future use; not currently rendered (in-SVG links are inert on GitHub). |

These appear on **gold** plinths, labelled `AWARDED`. Alongside them the build adds
**blue** `LIVE` trophies it can prove from the API right now — star and follower tiers,
your longest streak, century months, merge count, and your most-starred repository. A
live trophy disappears the moment the number stops supporting it.

Up to eight are drawn, declared ones first.

---

## `goals`

```json
"goals": [
  "SHIP ONE OPEN-SOURCE RELEASE A QUARTER",
  "GO DEEPER ON DISTRIBUTED SYSTEMS"
]
```

Rendered in the footer as *the chase*, and one is quoted verbatim in the commentary each
day, rotating by date. Written in caps and reproduced as written — re-casing them would
mangle acronyms. Around 46 characters fits the footer; four are drawn.

---

## `render`

```json
"render": { "cacheBust": true, "theme": "night-match" }
```

| Key | Notes |
| :-- | :-- |
| `cacheBust` | Appends `?v=<build stamp>` to asset URLs. **Leave this on.** GitHub's Camo proxy caches hard, and without it a rebuild is invisible to visitors. |
| `theme` | Reserved. Only `night-match` ships today; re-skinning is a `theme.mjs` edit. |

---

## Editor support

`config.json` declares `"$schema": "./docs/config.schema.json"`, so VS Code and any
JSON-Schema-aware editor give you completion and inline validation with no extension.
