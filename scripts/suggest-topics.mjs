#!/usr/bin/env node
/**
 * suggest-topics.mjs — derive GitHub topics for every one of your repositories from
 * what is actually in them, and optionally apply them.
 *
 *   node scripts/suggest-topics.mjs            # dry run: print what it would set
 *   node scripts/suggest-topics.mjs --apply    # write them (needs a token, see below)
 *   node scripts/suggest-topics.mjs --repo X   # just one repository
 *
 * WHY THIS EXISTS
 * ---------------
 * Topics are the single highest-leverage metadata on a GitHub repo. They drive GitHub's
 * own search and discovery, and in this project they are what the bowling arsenal and
 * kit bag match against. A repository with no topics is invisible to both.
 *
 * HOW IT DECIDES
 * --------------
 * Only from evidence in the repository:
 *   - dependency manifests (package.json, requirements.txt, pyproject.toml, go.mod,
 *     pom.xml, Gemfile, Cargo.toml) mapped through a curated dependency -> topic table
 *   - marker files in the root tree (Dockerfile, .github/workflows, terraform files)
 *   - the primary language reported by GitHub
 *
 * It does NOT invent topics from the repository name, because a name is a label you
 * chose, not evidence of what the code uses. Anything it cannot justify, it leaves out.
 *
 * TOKEN
 * -----
 * A dry run works unauthenticated but will exhaust the 60/hour anonymous limit quickly.
 * `--apply` needs a token with permission to write repository metadata:
 *   classic PAT      -> `public_repo` (or `repo` for private repositories)
 *   fine-grained PAT -> Repository permissions > Administration: Read and write
 * Provide it as GH_TOKEN. Never paste a token into a chat or commit it.
 */

const LOGIN_ARG = process.argv.indexOf('--user');
const REPO_ARG = process.argv.indexOf('--repo');
const APPLY = process.argv.includes('--apply');
const ONLY = REPO_ARG >= 0 ? process.argv[REPO_ARG + 1] : null;

const REST = 'https://api.github.com';
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || null;

/**
 * Dependency / marker -> topic. Keys are matched as substrings of a dependency name or
 * exactly against a root filename. Values are valid GitHub topics (lowercase, hyphens).
 */
const DEPS = {
  // --- JS / TS ---------------------------------------------------------------
  react: 'react',
  'react-dom': 'react',
  next: 'nextjs',
  vue: 'vuejs',
  svelte: 'svelte',
  express: 'express',
  '@nestjs/core': 'nestjs',
  tailwindcss: 'tailwindcss',
  vite: 'vite',
  typescript: 'typescript',
  prisma: 'prisma',
  mongoose: 'mongodb',
  socket: 'websockets',
  electron: 'electron',
  'three': 'threejs',
  d3: 'd3js',
  // --- Python ----------------------------------------------------------------
  django: 'django',
  djangorestframework: 'django-rest-framework',
  flask: 'flask',
  fastapi: 'fastapi',
  streamlit: 'streamlit',
  pandas: 'pandas',
  numpy: 'numpy',
  'scikit-learn': 'scikit-learn',
  matplotlib: 'data-visualization',
  seaborn: 'data-visualization',
  torch: 'pytorch',
  tensorflow: 'tensorflow',
  keras: 'keras',
  transformers: 'transformers',
  langchain: 'langchain',
  'llama-index': 'llamaindex',
  openai: 'openai',
  anthropic: 'anthropic',
  chromadb: 'vector-database',
  faiss: 'vector-database',
  pinecone: 'vector-database',
  'sentence-transformers': 'embeddings',
  opencv: 'opencv',
  'opencv-python': 'computer-vision',
  ultralytics: 'yolo',
  pytesseract: 'ocr',
  celery: 'celery',
  redis: 'redis',
  psycopg: 'postgresql',
  sqlalchemy: 'sqlalchemy',
  boto3: 'aws',
  scrapy: 'web-scraping',
  beautifulsoup4: 'web-scraping',
  // --- Other ecosystems ------------------------------------------------------
  'spring-boot': 'spring-boot',
  gin: 'golang',
  actix: 'rust',
};

/** Root-tree filenames (or path prefixes) that imply a topic. */
const MARKERS = {
  Dockerfile: 'docker',
  'docker-compose.yml': 'docker',
  'docker-compose.yaml': 'docker',
  '.github/workflows': 'github-actions',
  'main.tf': 'terraform',
  'Chart.yaml': 'helm',
  'k8s': 'kubernetes',
  'kubernetes': 'kubernetes',
  'vercel.json': 'vercel',
  'netlify.toml': 'netlify',
  'requirements.txt': null,
};

/** GitHub language -> topic, for the always-true baseline. */
const LANGS = {
  Python: 'python',
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Java: 'java',
  Go: 'golang',
  Rust: 'rust',
  'C++': 'cpp',
  'C#': 'csharp',
  Ruby: 'ruby',
  PHP: 'php',
  HCL: 'terraform',
  Shell: 'shell',
  Dart: 'flutter',
  Kotlin: 'kotlin',
  Swift: 'swift',
};

const headers = {
  'User-Agent': 'cricket-profile-readme/suggest-topics',
  Accept: 'application/vnd.github+json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function api(path, init) {
  const res = await fetch(path.startsWith('http') ? path : REST + path, { headers, ...init });
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
    const mins = Math.ceil((Number(res.headers.get('x-ratelimit-reset')) * 1000 - Date.now()) / 60000);
    throw new Error(`Rate limit exhausted; resets in ~${mins} min. Set GH_TOKEN to raise it to 5,000/hour.`);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** Fetch and decode a text file from a repository, or null if absent. */
async function file(owner, repo, path) {
  const j = await api(`/repos/${owner}/${repo}/contents/${path}`);
  if (!j?.content) return null;
  return Buffer.from(j.content, 'base64').toString('utf8');
}

/** Everything we can justify for one repository. */
async function suggest(r) {
  const found = new Set();
  const why = new Map();
  const add = (topic, reason) => {
    if (!topic) return;
    found.add(topic);
    if (!why.has(topic)) why.set(topic, reason);
  };

  if (r.language && LANGS[r.language]) add(LANGS[r.language], `primary language ${r.language}`);

  const root = (await api(`/repos/${r.owner.login}/${r.name}/contents`)) ?? [];
  const names = root.map((e) => e.name);
  for (const [marker, topic] of Object.entries(MARKERS)) {
    if (topic && names.includes(marker)) add(topic, `${marker} in root`);
  }

  // package.json
  if (names.includes('package.json')) {
    const raw = await file(r.owner.login, r.name, 'package.json');
    try {
      const pkg = JSON.parse(raw ?? '{}');
      const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
      for (const d of deps) {
        for (const [key, topic] of Object.entries(DEPS)) {
          if (d === key || d.startsWith(key)) add(topic, `depends on ${d}`);
        }
      }
    } catch {
      /* unparseable manifest is not fatal */
    }
  }

  // Python manifests
  for (const manifest of ['requirements.txt', 'pyproject.toml']) {
    if (!names.includes(manifest)) continue;
    const raw = (await file(r.owner.login, r.name, manifest)) ?? '';
    const lower = raw.toLowerCase();
    for (const [key, topic] of Object.entries(DEPS)) {
      if (lower.includes(key.toLowerCase())) add(topic, `${manifest} lists ${key}`);
    }
  }

  if (names.some((n) => n.endsWith('.tf'))) add('terraform', '.tf files present');

  // GitHub caps topics at 20; keep the most specific by dropping the bare language last.
  const list = [...found].slice(0, 20);
  return { list, why };
}

async function main() {
  const login =
    LOGIN_ARG >= 0
      ? process.argv[LOGIN_ARG + 1]
      : JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../config.json', import.meta.url), 'utf8'))
          .github.username;

  process.stderr.write(`> inspecting repositories for @${login}${token ? '' : ' (unauthenticated)'}\n\n`);

  const repos = (await api(`/users/${encodeURIComponent(login)}/repos?per_page=100&sort=pushed`)) ?? [];
  const targets = repos.filter((r) => !r.fork && (!ONLY || r.name === ONLY));

  let changed = 0;
  for (const r of targets) {
    const existing = r.topics ?? [];
    const { list, why } = await suggest(r);
    const merged = [...new Set([...existing, ...list])].slice(0, 20);
    const added = merged.filter((t) => !existing.includes(t));

    process.stdout.write(`${r.name}\n`);
    process.stdout.write(`  current : ${existing.length ? existing.join(', ') : '(none)'}\n`);
    process.stdout.write(`  proposed: ${merged.join(', ') || '(nothing could be justified)'}\n`);
    for (const t of added) process.stdout.write(`     + ${t}  <- ${why.get(t)}\n`);

    if (!added.length) {
      process.stdout.write('  no change\n\n');
      continue;
    }
    changed++;

    if (APPLY) {
      if (!token) {
        process.stdout.write('  SKIPPED: --apply needs GH_TOKEN\n\n');
        continue;
      }
      await api(`/repos/${r.owner.login}/${r.name}/topics`, {
        method: 'PUT',
        body: JSON.stringify({ names: merged }),
      });
      process.stdout.write('  APPLIED\n\n');
    } else {
      process.stdout.write('\n');
    }
  }

  process.stderr.write(
    `\n${changed} repositor${changed === 1 ? 'y' : 'ies'} would change.` +
      (APPLY ? ' Applied.\n' : ' Re-run with --apply to write them.\n'),
  );
}

main().catch((e) => {
  process.stderr.write(`\nsuggest-topics failed: ${e.message}\n`);
  // exitCode rather than exit(): calling exit() while a fetch socket is still closing
  // trips a libuv assertion on Windows. Let the loop drain naturally.
  process.exitCode = 1;
});
