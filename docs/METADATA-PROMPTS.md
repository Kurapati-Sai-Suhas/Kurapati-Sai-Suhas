# Metadata-collection prompts

One prompt per repository. Each sends Claude into the **actual code** to derive a GitHub
description and topic list from evidence, then apply them.

## Why this is worth doing

GitHub topics and descriptions are the only machine-readable statement of what a repo
contains. Right now they are empty across all 8 of your repositories, which costs you
three separate things:

1. **GitHub search.** A repo with no topics is effectively unlisted. Nobody browsing
   `topic:rag` or `topic:mediapipe` will ever reach you.
2. **Recruiters.** The repo list on your profile shows descriptions. Eight blank rows
   reads as eight abandoned experiments, whatever the code actually does.
3. **This README.** The bowling arsenal matches against name, description, topics and
   language — nothing else. With metadata empty, `AI / LLM` and `VISION / MODELS` render
   `0/5`, so the two areas you actually specialise in are the two that look emptiest.

Point 3 is the smallest of the three. Fix this for 1 and 2.

## How to run them

**Best — Claude Code, inside a clone.** Claude reads real files, so nothing is guessed:

```bash
git clone https://github.com/Kurapati-Sai-Suhas/<repo> && cd <repo> && claude
```

Then paste the prompt for that repo.

**Alternative — claude.ai**: paste the prompt and add the repo URL. Claude can only see
what is publicly fetchable, so verify its claims before applying them.

**One chat per repository.** A single chat spanning eight repos spends most of its budget
re-reading the wrong one, and cross-contaminates details between projects.

## Applying the result

Once you have a description and topic list, either use the repo's *About* ⚙️ panel, or:

```bash
gh repo edit Kurapati-Sai-Suhas/<repo> --description "<the description>"
gh repo edit Kurapati-Sai-Suhas/<repo> --add-topic rag,langchain,django
```

Or let this project's own tool do the topic half from dependency evidence:

```bash
npm run topics              # dry run, shows evidence for each suggestion
node scripts/suggest-topics.mjs --apply    # needs GH_TOKEN with public_repo
```

The two approaches are complementary: `suggest-topics.mjs` is mechanical and only reads
manifests, so it will find `django` and `opencv` but never `21-cfr-part-11` or
`elo-rating`. The prompts below catch the domain concepts a dependency list cannot show.

---

## A note on the context lines below

Where a prompt says *"What I believe this is"*, that is drawn from how you described your
own work, not from reading the code. Two of them I could corroborate against GitHub, the
rest I could not:

| Repo | Basis | Confidence |
| :-- | :-- | :-- |
| SparkLM | Its live GitHub description matches your description of the adaptive-coding platform almost word for word | **Confirmed** |
| GxP-Training-Bot | Name matches your compliance-training project; GxP and 21 CFR Part 11 are the same domain | **High** |
| Suhasvision | Name plus your cricket-coaching/pose-estimation work | **Likely** |
| Mail-Mind-Ai | Could be your Ollama/ChromaDB RAG assistant, but the name suggests email | **Unsure — verify** |
| The other 4 | You did not mention them | **No context** |

Every prompt instructs Claude to contradict that line if the code disagrees. Do not let
it write a description around an assumption I made.

---

## `SparkLM`

TypeScript · 70 commits · 1 star · your most-starred repo

```text
You are helping me write accurate GitHub metadata for ONE repository: SparkLM.

Read the repository properly before writing anything: package.json, the README,
the directory structure, entry points, config, tests, and any CI workflows.

What I believe this is (correct me if the code disagrees): an adaptive coding
practice platform with a hybrid LLM routing engine over Groq and Gemini, Elo-based
skill modelling, a prerequisite curriculum DAG, spaced-repetition scheduling, and a
sandboxed Judge0 code-execution pipeline, with 100+ automated tests.

Produce exactly this, and nothing else:

1. A GitHub description, one sentence, under 350 characters. Concrete about what it
   does and what it is built with. No marketing adjectives.

2. Between 8 and 20 GitHub topics (lowercase, hyphens, no spaces). For EACH topic,
   cite the file or line that justifies it, e.g.
       llm-routing   <- src/services/router.ts selects between Groq and Gemini
   Drop any topic you cannot cite. Include both stack topics (typescript, nextjs)
   and domain topics (elo-rating, spaced-repetition, code-execution) where earned.

3. A 3-5 line "About" paragraph I can paste at the top of the README, written for a
   recruiter skimming for 10 seconds.

4. A list of anything you found that is impressive but currently INVISIBLE from the
   outside — test coverage, fallback handling, rate limiting, sandbox isolation. This
   is the part I most want to surface.

Rules:
- Evidence only. If you cannot point at a file, do not claim it.
- If the code contradicts what I said above, tell me directly.
- Flag anything that looks like a committed secret or key.
```

---

## `GxP-Training-Bot`

Python · 5 commits · no description · no topics

```text
You are helping me write accurate GitHub metadata for ONE repository: GxP-Training-Bot.

Read the repository properly first: requirements.txt or pyproject.toml, settings and
config modules, models, views/serializers, URL routing, middleware, tests, migrations.

What I believe this is (correct me if the code disagrees): a compliance-training
platform with NVIDIA NIM (Llama 3.1) behind a provider-agnostic AI service layer, a
deterministic offline fallback so the pipeline degrades instead of hard-failing,
role-based access control across 20+ endpoints, and an audit trail modelled on
21 CFR Part 11.

Produce exactly this, and nothing else:

1. A GitHub description, one sentence, under 350 characters.

2. Between 8 and 20 GitHub topics (lowercase, hyphens). Cite the file justifying each.
   I specifically want you to check for and, if real, include: nvidia-nim, llama,
   django, django-rest-framework, celery, redis, postgresql, rbac, audit-log,
   compliance, 21-cfr-part-11, llm-fallback. Include only what you can cite.

3. A 3-5 line README "About" paragraph aimed at a recruiter.

4. Two things I care about most — verify whether they are actually implemented, and
   point me at the code:
   a. the provider-agnostic AI layer: how many providers can it really swap between?
   b. the offline fallback: is it deterministic, and is it tested?

Rules:
- Evidence only. No claim without a file reference.
- Contradict my description above if the code says otherwise.
- Flag any committed secret, API key, or .env file.
```

---

## `Suhasvision`

JavaScript · 4 commits · no description · no topics

```text
You are helping me write accurate GitHub metadata for ONE repository: Suhasvision.

Read the repository properly first. GitHub reports the primary language as
JavaScript, so establish early whether the ML work lives here or the repo is a
frontend for a model hosted elsewhere. Say which.

What I believe this is (correct me if the code disagrees): a cricket coaching tool
using vision-LLM and pose estimation — MediaPipe BlazePose, Monte Carlo Dropout for
uncertainty quantification, and Leave-One-Out cross-validation. I also fixed an IDOR
vulnerability in it at some point.

Produce exactly this, and nothing else:

1. A GitHub description, one sentence, under 350 characters.

2. Between 8 and 20 GitHub topics (lowercase, hyphens), each with a file citation.
   Check specifically for: mediapipe, blazepose, pose-estimation, computer-vision,
   uncertainty-quantification, monte-carlo-dropout, cross-validation, sports-analytics.

3. A 3-5 line README "About" paragraph aimed at a recruiter.

4. Answer these directly:
   a. Where does the pose estimation actually run — browser or server?
   b. Is the Monte Carlo Dropout uncertainty work present in this repo, or another?
   c. Is the IDOR fix visible in the current code? Show me the authorisation check.
      If you cannot find one, say so plainly — that matters more than a topic list.

Rules:
- Evidence only.
- Contradict my description above if the code disagrees.
- Flag any committed secret or missing authorisation check you notice in passing.
```

---

## `Mail-Mind-Ai`

Python · no description · no topics

```text
You are helping me write accurate GitHub metadata for ONE repository: Mail-Mind-Ai.

Read the repository properly first: requirements/pyproject, entry points, any
model/embedding/vector-store code, and the README if one exists.

I am NOT certain what this one is. It may be my local privacy-first RAG assistant
built on Ollama and ChromaDB with per-tenant embedding isolation, or it may be an
email-processing tool, or both. Determine which from the code and tell me — do not
assume from the name.

Produce exactly this, and nothing else:

1. A one-paragraph statement of what this repository actually does, based only on
   what you read.

2. A GitHub description, one sentence, under 350 characters.

3. Between 8 and 20 GitHub topics (lowercase, hyphens), each with a file citation.
   Check for: rag, ollama, chromadb, embeddings, vector-database, local-llm,
   privacy, python, email-automation, imap.

4. A 3-5 line README "About" paragraph aimed at a recruiter.

5. If there is multi-tenant or per-user data isolation, show me exactly where it is
   enforced. If there is not, say so — I would rather know.

Rules:
- Evidence only. Name the file behind every claim.
- Flag any committed secret or credential.
```

---

## `Crop-Recommendation-website`, `travel-ai-planner`, `data-analysis-on-coffee-and-titanic-data-sets`, `cricket-profile-readme`

I have no context on these beyond language and name, so the prompt is the generic one
below with the name filled in. Do not let Claude infer purpose from the repo name.

---

## Generic template — any repository

```text
You are helping me write accurate GitHub metadata for ONE repository: <NAME>.

I am a third-year CSE (AI & ML) student. My public repos currently have no topics and
mostly no descriptions, which makes them invisible to GitHub search and unreadable to
anyone skimming my profile. I am fixing that repo by repo.

Step 1 — read before writing. Go through the dependency manifest, README, directory
structure, entry points, config, tests and CI. Then tell me in five lines what this
repository actually does and how it is put together. If it is unfinished or a
prototype, say so; I would rather have an honest description than an inflated one.

Step 2 — produce exactly this:

1. A GitHub description, one sentence, under 350 characters. Concrete, no marketing
   language. It should tell a stranger what the thing does and what it is built with.

2. Between 8 and 20 GitHub topics, lowercase with hyphens. For EACH one, cite the
   file that justifies it:
       <topic>   <- <file>: <what you saw>
   Drop anything you cannot cite. Cover the stack (language, framework, database,
   infra) and the domain (what problem it solves). Do not infer topics from the
   repository NAME — a name is a label I chose, not evidence about the code.

3. A 3-5 line "About" paragraph for the top of the README, written for a recruiter
   skimming for 10 seconds.

4. Anything impressive that is currently invisible from outside: tests, fallback
   handling, auth, caching, CI. These are the things that separate a finished project
   from a demo, and none of them show up in a file listing.

5. The single highest-value improvement I could make to this repo in under an hour.

Rules:
- Evidence only. No claim without a file reference.
- Ask me rather than guessing if intent is genuinely ambiguous.
- Flag any committed secret, key, or .env file immediately.
```

---

## After you have filled everything in

Rebuild the profile and the arsenal will reflect it:

```bash
npm run build
```

The `AI / LLM` and `VISION / MODELS` rows populate from the topics you just added.
Nothing in the renderer changes — it simply has something real to match against.
