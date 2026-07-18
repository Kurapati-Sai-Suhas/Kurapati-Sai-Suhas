# All Source Codes for Cricket Profile README

## README.md

```markdown
<!-- 
  Hi! This README is generated automatically by a script.
  To customize the template, edit the files in the svg-templates/ folder.
-->

<div align="center">

# 🏏 The Interactive Cricket GitHub Profile 🏏
<br>

<img src="./assets/hero.svg" width="100%" alt="Welcome to the Stadium" />

<br>
<img src="./assets/scoreboard.svg" width="100%" alt="Match Statistics" />

<br>
<img src="./assets/batting.svg" width="100%" alt="Batting Average - Top Languages" />

<br>
<img src="./assets/bowling.svg" width="100%" alt="Bowling Arsenal - Technologies" />

<br>
<img src="./assets/fixtures.svg" width="100%" alt="Tournament Fixtures - Featured Projects" />

<br>
<img src="./assets/footer.svg" width="100%" alt="Live Match Commentary" />

<br>

### How this profile works:
This README is updated daily via a [GitHub Action](./.github/workflows/update-readme.yml) that fetches my latest GitHub stats and dynamically injects them into custom-designed pixel art SVG templates! 

*Theme: Retro Cricket World Cup (Team India Edition)* 🇮🇳
</div>

```

## scripts/generate_readme.js

```javascript
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'Kurapati-Sai-Suhas';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Configuration for what to display if API is not available or projects are not specified
const CONFIG = {
  name: GITHUB_USERNAME,
  languages: [
    { name: 'JavaScript', pct: 45 },
    { name: 'TypeScript', pct: 25 },
    { name: 'Python', pct: 15 },
    { name: 'HTML/CSS', pct: 10 },
    { name: 'Go', pct: 5 }
  ],
  backend: ['Node.js', 'PostgreSQL', 'AWS', 'Docker', 'TensorFlow', 'Git'],
  projects: [
    { name: 'PROJECT-ALPHA', desc: 'A revolutionary new platform.', stars: 124 },
    { name: 'BETA-TOOLKIT', desc: 'Utilities for everyday dev.', stars: 89 },
    { name: 'GAMMA-AI', desc: 'Machine learning models.', stars: 256 },
    { name: 'DELTA-SERVICE', desc: 'High performance backend.', stars: 42 }
  ],
  stats: {
    commits: 1337,
    prs: 404,
    stars: 808,
    issues: 200
  }
};

// Paths
const TEMPLATE_DIR = path.join(__dirname, '..', 'svg-templates');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

async function fetchGitHubData() {
  if (!GITHUB_TOKEN) {
    console.log('No GITHUB_TOKEN found. Using dummy data for generation.');
    return;
  }

  try {
    console.log(`Fetching data for ${GITHUB_USERNAME}...`);
    const query = `
      query {
        user(login: "${GITHUB_USERNAME}") {
          name
          contributionsCollection {
            totalCommitContributions
          }
          repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: STARGAZERS, direction: DESC}) {
            totalCount
            nodes {
              name
              stargazerCount
              description
              languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                edges {
                  size
                  node {
                    name
                  }
                }
              }
              repositoryTopics(first: 5) {
                nodes {
                  topic {
                    name
                  }
                }
              }
            }
          }
          pullRequests(first: 1) {
            totalCount
          }
          issues(first: 1) {
            totalCount
          }
        }
      }
    `;

    const response = await axios.post(
      'https://api.github.com/graphql',
      { query },
      { headers: { Authorization: `bearer ${GITHUB_TOKEN}` } }
    );

    const user = response.data.data.user;
    if (user.name) CONFIG.name = user.name;
    
    // Assign stats
    CONFIG.stats.commits = user.contributionsCollection.totalCommitContributions || 0;
    CONFIG.stats.prs = user.pullRequests.totalCount;
    CONFIG.stats.issues = user.issues.totalCount;

    const langSizes = {};
    const topicCounts = {};
    let totalSize = 0;
    
    const repos = user.repositories.nodes;
    if (repos.length > 0) {
      CONFIG.stats.stars = repos.reduce((sum, repo) => sum + repo.stargazerCount, 0);

      CONFIG.projects = repos.slice(0, 4).map(repo => ({
        name: repo.name.substring(0, 20),
        desc: (repo.description || 'No description').substring(0, 35) + '...',
        stars: repo.stargazerCount
      }));
      while (CONFIG.projects.length < 4) {
        CONFIG.projects.push({ name: 'Coming Soon', desc: '...', stars: 0 });
      }

      repos.forEach(repo => {
        if (repo.languages && repo.languages.edges) {
          repo.languages.edges.forEach(edge => {
            langSizes[edge.node.name] = (langSizes[edge.node.name] || 0) + edge.size;
            totalSize += edge.size;
          });
        }
        if (repo.repositoryTopics && repo.repositoryTopics.nodes) {
          repo.repositoryTopics.nodes.forEach(node => {
            topicCounts[node.topic.name] = (topicCounts[node.topic.name] || 0) + 1;
          });
        }
      });

      const langArray = Object.keys(langSizes).map(key => ({
        name: key,
        pct: Math.round((langSizes[key] / totalSize) * 100)
      })).sort((a, b) => b.pct - a.pct);

      if (langArray.length > 0) {
        CONFIG.languages = langArray.slice(0, 5);
        while (CONFIG.languages.length < 5) {
          CONFIG.languages.push({ name: 'N/A', pct: 0 });
        }
        
        // Use remaining languages to pad topics if we don't have enough topics
        const remainingLangs = langArray.slice(5).map(l => l.name);
        let topTopics = Object.keys(topicCounts).sort((a, b) => topicCounts[b] - topicCounts[a]);
        
        let combinedBackend = [...topTopics, ...remainingLangs];
        if (combinedBackend.length > 0) {
          CONFIG.backend = combinedBackend.slice(0, 6);
        }
        while (CONFIG.backend.length < 6) {
          CONFIG.backend.push('Dev Tool');
        }
      }
    }

  } catch (error) {
    console.error('Error fetching from GitHub API. Falling back to dummy data.', error.message);
  }
}

function processTemplate(templateName) {
  const templatePath = path.join(TEMPLATE_DIR, `${templateName}.svg`);
  if (!fs.existsSync(templatePath)) return;

  let content = fs.readFileSync(templatePath, 'utf8');

  // Replace Hero
  content = content.replace(/{{NAME}}/g, CONFIG.name.toUpperCase());

  // Replace Scoreboard
  content = content.replace(/{{TOTAL_COMMITS}}/g, CONFIG.stats.commits);
  content = content.replace(/{{TOTAL_PRS}}/g, CONFIG.stats.prs);
  content = content.replace(/{{TOTAL_STARS}}/g, CONFIG.stats.stars);
  content = content.replace(/{{TOTAL_ISSUES}}/g, CONFIG.stats.issues);

  // Replace Batting
  CONFIG.languages.forEach((lang, i) => {
    const idx = i + 1;
    const width = Math.max(10, Math.floor((lang.pct / 100) * 700)); // Max width ~700px
    const txtPos = 120 + width + 10;
    
    content = content.replace(new RegExp(`{{LANG_${idx}_NAME}}`, 'g'), lang.name.toUpperCase());
    content = content.replace(new RegExp(`{{LANG_${idx}_PCT}}`, 'g'), lang.pct);
    content = content.replace(new RegExp(`{{LANG_${idx}_WIDTH}}`, 'g'), width);
    content = content.replace(new RegExp(`{{LANG_${idx}_TXT_POS}}`, 'g'), txtPos);
  });

  // Replace Bowling
  CONFIG.backend.forEach((tech, i) => {
    content = content.replace(new RegExp(`{{BOWLING_${i + 1}_NAME}}`, 'g'), tech.toUpperCase());
  });

  // Replace Fixtures
  CONFIG.projects.forEach((proj, i) => {
    const idx = i + 1;
    content = content.replace(new RegExp(`{{PROJ_${idx}_NAME}}`, 'g'), proj.name);
    content = content.replace(new RegExp(`{{PROJ_${idx}_DESC}}`, 'g'), proj.desc);
    content = content.replace(new RegExp(`{{PROJ_${idx}_STARS}}`, 'g'), proj.stars);
  });

  // Replace Footer
  // content = content.replace(/{{VISITOR_COUNT}}/g, CONFIG.visitors.toLocaleString());

  const outputPath = path.join(ASSETS_DIR, `${templateName}.svg`);
  fs.writeFileSync(outputPath, content);
  console.log(`Generated: ${outputPath}`);
}

async function main() {
  console.log('Starting GitHub Profile Generation (Cricket Edition)...');
  await fetchGitHubData();
  
  const templates = ['hero', 'scoreboard', 'batting', 'bowling', 'fixtures', 'footer'];
  templates.forEach(processTemplate);
  
  console.log('Successfully generated all SVGs!');
}

main();

```

## deploy.js

```javascript
const axios = require('axios');
const sodium = require('libsodium-wrappers');

const TOKEN = 'YOUR_GITHUB_TOKEN_HERE';
const USERNAME = 'Kurapati-Sai-Suhas';
const REPO_NAME = 'Kurapati-Sai-Suhas';

const api = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `token ${TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  },
});

async function main() {
  try {
    console.log(`Checking if repository ${USERNAME}/${REPO_NAME} exists...`);
    try {
      await api.get(`/repos/${USERNAME}/${REPO_NAME}`);
      console.log('Repository already exists.');
    } catch (e) {
      if (e.response && e.response.status === 404) {
        console.log('Creating repository...');
        await api.post('/user/repos', {
          name: REPO_NAME,
          description: 'My Interactive Cricket Profile README',
          private: false,
          auto_init: false,
        });
        console.log('Repository created successfully.');
      } else {
        throw e;
      }
    }

    console.log('Fetching repository public key...');
    const { data: keyData } = await api.get(`/repos/${USERNAME}/${REPO_NAME}/actions/secrets/public-key`);
    
    console.log('Encrypting secret...');
    await sodium.ready;
    const binkey = sodium.from_base64(keyData.key, sodium.base64_variants.ORIGINAL);
    const binsec = sodium.from_string(TOKEN);
    const encBytes = sodium.crypto_box_seal(binsec, binkey);
    const encryptedValue = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

    console.log('Setting repository secret GH_PAT...');
    await api.put(`/repos/${USERNAME}/${REPO_NAME}/actions/secrets/GH_PAT`, {
      encrypted_value: encryptedValue,
      key_id: keyData.key_id,
    });
    console.log('Secret set successfully.');
    
  } catch (error) {
    console.error('An error occurred:', error.response ? error.response.data : error.message);
  }
}

main();

```

## .github/workflows/update-readme.yml

```yaml
name: Update Cricket Profile README

on:
  schedule:
    - cron: '0 0 * * *' # Run daily at midnight
  workflow_dispatch: # Allow manual trigger

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Dependencies
        run: npm install

      - name: Generate Profile SVGs
        env:
          GITHUB_TOKEN: ${{ secrets.GH_PAT }}
          GITHUB_USERNAME: ${{ github.repository_owner }}
        run: node scripts/generate_readme.js

      - name: Commit and Push changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add assets/
          git commit -m "chore(stats): update cricket profile statistics" || exit 0
          git push

```

## svg-templates/hero.svg

```svg
<svg width="1000" height="400" viewBox="0 0 1000 400" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <!-- Night Sky Gradient -->
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#020111" />
      <stop offset="100%" stop-color="#000080" />
    </linearGradient>

    <!-- Pitch Gradient -->
    <linearGradient id="pitchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#4caf50" />
      <stop offset="100%" stop-color="#2e7d32" />
    </linearGradient>

    <!-- Central Pitch (22 yards) -->
    <linearGradient id="dirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#d4b886" />
      <stop offset="100%" stop-color="#b89355" />
    </linearGradient>

    <!-- Floodlight Glow -->
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>

    <!-- Star Animation -->
    <style>
      @keyframes twinkle {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
      }
      @keyframes flash {
        0%, 95%, 100% { opacity: 0; }
        97% { opacity: 1; }
      }
      @keyframes batTap {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(2px) rotate(2deg); }
      }
      @keyframes floatText {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
      }
      @keyframes ballBowl {
        0% { transform: translate(0, 0) scale(1); opacity: 1; }
        40% { transform: translate(-100px, 15px) scale(0.8); opacity: 1; }
        45% { transform: translate(-120px, -5px) scale(1.2); opacity: 1; }
        90% { transform: translate(-300px, -20px) scale(1.5); opacity: 0; }
        100% { transform: translate(0, 0) scale(1); opacity: 0; }
      }
      .star { animation: twinkle 3s infinite ease-in-out; }
      .flash { animation: flash 4s infinite; }
      .bat { animation: batTap 1.5s infinite ease-in-out; transform-origin: 65% 50%; }
      .title { animation: floatText 4s infinite ease-in-out; }
      
      .text-title { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800; font-size: 32px; fill: #ffffff; text-transform: uppercase; letter-spacing: 2px; }
      .text-subtitle { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 600; font-size: 16px; fill: #ff9933; letter-spacing: 4px; }
      .text-name { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 900; font-size: 58px; fill: #0082c4; stroke: #ffffff; stroke-width: 2px; letter-spacing: 1px; }
    </style>

    <g id="stadium-seats">
      <ellipse cx="500" cy="200" rx="600" ry="200" fill="#111" />
      <ellipse cx="500" cy="210" rx="580" ry="190" fill="#0082c4" />
      <ellipse cx="500" cy="220" rx="560" ry="180" fill="#005b8a" />
      <ellipse cx="500" cy="230" rx="540" ry="170" fill="#ff9933" />
      <ellipse cx="500" cy="240" rx="520" ry="160" fill="#111" />
    </g>

    <g id="floodlight">
      <rect x="-10" y="0" width="20" height="150" fill="#555" />
      <rect x="-40" y="-40" width="80" height="40" fill="#222" />
      <circle cx="-25" cy="-30" r="8" fill="#fff" filter="url(#glow)" />
      <circle cx="0" cy="-30" r="8" fill="#fff" filter="url(#glow)" />
      <circle cx="25" cy="-30" r="8" fill="#fff" filter="url(#glow)" />
      <circle cx="-25" cy="-10" r="8" fill="#fff" filter="url(#glow)" />
      <circle cx="0" cy="-10" r="8" fill="#fff" filter="url(#glow)" />
      <circle cx="25" cy="-10" r="8" fill="#fff" filter="url(#glow)" />
    </g>
    
    <g id="camera-flashes">
      <circle cx="0" cy="0" r="2" fill="#fff" class="flash" style="animation-delay: 0.1s" />
      <circle cx="100" cy="20" r="2" fill="#fff" class="flash" style="animation-delay: 1.2s" />
      <circle cx="-150" cy="15" r="2" fill="#fff" class="flash" style="animation-delay: 0.5s" />
      <circle cx="200" cy="5" r="2" fill="#fff" class="flash" style="animation-delay: 2.1s" />
      <circle cx="-250" cy="10" r="2" fill="#fff" class="flash" style="animation-delay: 3.4s" />
      <circle cx="300" cy="25" r="2" fill="#fff" class="flash" style="animation-delay: 0.8s" />
    </g>

    <g id="batter-pixel-art" shape-rendering="crispEdges">
      <!-- Minimalist pixel art batter in Team India colors (Blue, Orange) -->
      <!-- Head / Helmet (Navy Blue) -->
      <path d="M12,0 h6 v2 h-6 z M10,2 h10 v6 h-10 z M8,6 h2 v4 h-2 z" fill="#000080" />
      <!-- Visor/Face -->
      <path d="M20,4 h4 v4 h-4 z" fill="#ffd5b5" />
      <path d="M18,4 h2 v4 h-2 z" fill="#111" />
      <!-- Torso (India Blue) -->
      <path d="M10,8 h10 v12 h-10 z" fill="#0082c4" />
      <path d="M10,12 h10 v2 h-10 z" fill="#ff9933" /> <!-- Orange stripe -->
      <!-- Arms -->
      <path d="M6,10 h4 v10 h-4 z" fill="#0082c4" />
      <path d="M20,10 h4 v8 h-4 z" fill="#0082c4" />
      <!-- Gloves -->
      <path d="M6,20 h4 v4 h-4 z" fill="#fff" />
      <path d="M18,18 h4 v4 h-4 z" fill="#fff" />
      <!-- Bat -->
      <g class="bat">
        <path d="M16,18 h2 v-6 h-2 z" fill="#8b4513" /> <!-- Handle -->
        <path d="M15,22 h4 v14 h-4 z M14,36 h6 v2 h-6 z" fill="#e6c280" /> <!-- Blade -->
      </g>
      <!-- Legs (Blue pants, white pads) -->
      <path d="M10,20 h4 v10 h-4 z M16,20 h4 v10 h-4 z" fill="#0082c4" />
      <path d="M8,24 h6 v12 h-6 z M16,24 h6 v12 h-6 z" fill="#fff" />
      <path d="M10,26 h2 v8 h-2 z M18,26 h2 v8 h-2 z" fill="#ccc" />
      <!-- Shoes -->
      <path d="M8,36 h6 v2 h-6 z M16,36 h6 v2 h-6 z" fill="#111" />
    </g>

    <g id="bowler-pixel-art" shape-rendering="crispEdges">
      <!-- Head -->
      <path d="M10,2 h6 v6 h-6 z" fill="#ffd5b5" />
      <!-- Hair -->
      <path d="M8,0 h10 v2 h-10 z M8,2 h2 v2 h-2 z M16,2 h2 v2 h-2 z" fill="#111" />
      <!-- Torso (India Blue) -->
      <path d="M8,8 h10 v10 h-10 z" fill="#0082c4" />
      <path d="M8,12 h10 v2 h-10 z" fill="#ff9933" />
      <!-- Bowling Arm (Raised high) -->
      <path d="M4,0 h4 v10 h-4 z" fill="#0082c4" />
      <path d="M4,-4 h4 v4 h-4 z" fill="#ffd5b5" /> <!-- Hand -->
      <!-- Other Arm -->
      <path d="M18,10 h4 v8 h-4 z" fill="#0082c4" />
      <!-- Legs -->
      <path d="M8,18 h4 v12 h-4 z M14,18 h4 v12 h-4 z" fill="#0082c4" />
      <!-- Shoes -->
      <path d="M6,30 h6 v2 h-6 z M14,30 h6 v2 h-6 z" fill="#fff" />
    </g>
  </defs>

  <!-- Background Sky -->
  <rect width="100%" height="400" fill="url(#skyGrad)" />

  <!-- Stars -->
  <circle cx="100" cy="50" r="1.5" fill="#fff" class="star" style="animation-delay: 0s"/>
  <circle cx="300" cy="80" r="1" fill="#fff" class="star" style="animation-delay: 1s"/>
  <circle cx="700" cy="40" r="2" fill="#fff" class="star" style="animation-delay: 2s"/>
  <circle cx="850" cy="90" r="1.5" fill="#fff" class="star" style="animation-delay: 0.5s"/>
  <circle cx="500" cy="30" r="1" fill="#fff" class="star" style="animation-delay: 1.5s"/>

  <!-- Stadium -->
  <use href="#stadium-seats" x="0" y="40" />
  
  <g transform="translate(500, 240)">
    <use href="#camera-flashes" />
  </g>

  <!-- Pitch Area -->
  <ellipse cx="500" cy="330" rx="600" ry="110" fill="url(#pitchGrad)" />
  <rect x="250" y="300" width="500" height="60" fill="url(#dirtGrad)" rx="5" />
  
  <!-- Crease Lines -->
  <line x1="300" y1="300" x2="300" y2="360" stroke="#fff" stroke-width="2" />
  <line x1="700" y1="300" x2="700" y2="360" stroke="#fff" stroke-width="2" />
  <line x1="280" y1="310" x2="320" y2="310" stroke="#fff" stroke-width="2" />
  <line x1="680" y1="310" x2="720" y2="310" stroke="#fff" stroke-width="2" />

  <!-- Wickets -->
  <g id="wickets" stroke="#f4a460" stroke-width="2">
    <line x1="270" y1="335" x2="270" y2="315" />
    <line x1="273" y1="335" x2="273" y2="315" />
    <line x1="276" y1="335" x2="276" y2="315" />
    <!-- Bails -->
    <line x1="269" y1="315" x2="277" y2="315" stroke-width="1" />
    
    <line x1="730" y1="335" x2="730" y2="315" />
    <line x1="733" y1="335" x2="733" y2="315" />
    <line x1="736" y1="335" x2="736" y2="315" />
    <line x1="729" y1="315" x2="737" y2="315" stroke-width="1" />
  </g>

  <!-- Floodlights -->
  <use href="#floodlight" x="150" y="100" />
  <use href="#floodlight" x="850" y="100" />
  
  <!-- Scoreboard screen in background -->
  <g transform="translate(400, 100)">
    <rect x="0" y="0" width="200" height="80" fill="#111" stroke="#333" stroke-width="4" rx="5" />
    <text x="100" y="30" fill="#fff" font-family="Courier, monospace" font-size="14" font-weight="bold" text-anchor="middle">IND vs REST OF WORLD</text>
    <text x="100" y="60" fill="#ff9933" font-family="Courier, monospace" font-size="24" font-weight="bold" text-anchor="middle">DAY 1</text>
  </g>

  <!-- Characters -->
  <!-- Batter (Master Blaster) on left crease -->
  <g transform="translate(290, 290) scale(1.5)">
    <use href="#batter-pixel-art" />
  </g>

  <!-- Bowler (Swing King) on right crease -->
  <g transform="translate(680, 290) scale(1.5)">
    <use href="#bowler-pixel-art" />
  </g>

  <!-- Title Text -->
  <g class="title">
    <text x="500" y="60" text-anchor="middle" class="text-subtitle">ICC WORLD CUP EDITION</text>
    <text x="500" y="100" text-anchor="middle" class="text-title">WELCOME TO THE PROFILE OF</text>
    <!-- Replace this with a parameter when generating -->
    <text x="500" y="170" text-anchor="middle" class="text-name">{{NAME}}</text>
  </g>

</svg>

```

## svg-templates/scoreboard.svg

```svg
<svg width="1000" height="300" viewBox="0 0 1000 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient for Stadium wall -->
    <linearGradient id="wallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#020111" />
      <stop offset="100%" stop-color="#1a1a2e" />
    </linearGradient>

    <!-- Scoreboard Bezel Gradient -->
    <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#333" />
      <stop offset="100%" stop-color="#111" />
    </linearGradient>

    <!-- LED Glow Filter -->
    <filter id="ledGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <style>
      .led-text { font-family: 'Courier New', Courier, monospace; font-weight: bold; fill: #ff9933; filter: url(#ledGlow); }
      .led-label { font-family: 'Courier New', Courier, monospace; font-weight: bold; fill: #4caf50; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; }
      .led-title { font-family: 'Courier New', Courier, monospace; font-weight: 900; fill: #ffffff; font-size: 24px; text-transform: uppercase; letter-spacing: 4px; filter: url(#ledGlow); }
      
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.2; }
      }
      .blinking { animation: blink 2s infinite; }
      
      /* Grid pattern for the LED screen */
      .screen-bg { fill: #0a0a0a; }
    </style>

    <pattern id="grid" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="#000" fill-opacity="0.5" />
      <circle cx="2" cy="2" r="1" fill="#222" />
    </pattern>
  </defs>

  <!-- Wall Background -->
  <rect width="1000" height="300" fill="url(#wallGrad)" />

  <!-- Scoreboard Outer Frame -->
  <rect x="50" y="20" width="900" height="260" fill="url(#bezelGrad)" rx="15" ry="15" stroke="#444" stroke-width="4" />
  
  <!-- Scoreboard Inner Screen -->
  <rect x="70" y="40" width="860" height="220" class="screen-bg" rx="5" ry="5" />
  <rect x="70" y="40" width="860" height="220" fill="url(#grid)" rx="5" ry="5" /> <!-- LED dot pattern -->

  <!-- Title -->
  <text x="500" y="80" text-anchor="middle" class="led-title">MATCH STATISTICS - GITHUB OVERALL</text>

  <!-- Divider Line -->
  <line x1="100" y1="100" x2="900" y2="100" stroke="#333" stroke-width="2" stroke-dasharray="10, 5" />

  <!-- Stats Grid -->
  <!-- Commits (Runs) -->
  <g transform="translate(150, 130)">
    <rect x="0" y="0" width="150" height="80" fill="#111" stroke="#333" stroke-width="2" rx="4" />
    <text x="75" y="25" text-anchor="middle" class="led-label">RUNS (COMMITS)</text>
    <text x="75" y="65" text-anchor="middle" font-size="36" class="led-text">{{TOTAL_COMMITS}}</text>
  </g>

  <!-- PRs (Centuries) -->
  <g transform="translate(340, 130)">
    <rect x="0" y="0" width="150" height="80" fill="#111" stroke="#333" stroke-width="2" rx="4" />
    <text x="75" y="25" text-anchor="middle" class="led-label">100S (PULL REQ)</text>
    <text x="75" y="65" text-anchor="middle" font-size="36" class="led-text">{{TOTAL_PRS}}</text>
  </g>

  <!-- Stars (Strike Rate) -->
  <g transform="translate(530, 130)">
    <rect x="0" y="0" width="150" height="80" fill="#111" stroke="#333" stroke-width="2" rx="4" />
    <text x="75" y="25" text-anchor="middle" class="led-label">S/R (STARS)</text>
    <text x="75" y="65" text-anchor="middle" font-size="36" class="led-text">{{TOTAL_STARS}}</text>
  </g>

  <!-- Issues (Wickets) -->
  <g transform="translate(720, 130)">
    <rect x="0" y="0" width="150" height="80" fill="#111" stroke="#333" stroke-width="2" rx="4" />
    <text x="75" y="25" text-anchor="middle" class="led-label">WKTS (ISSUES)</text>
    <text x="75" y="65" text-anchor="middle" font-size="36" class="led-text">{{TOTAL_ISSUES}}</text>
  </g>

  <!-- Blinking Live Indicator -->
  <g transform="translate(860, 75)" class="blinking">
    <circle cx="0" cy="-5" r="5" fill="#f00" filter="url(#ledGlow)" />
    <text x="15" y="0" font-family="Courier New" font-size="14" font-weight="bold" fill="#f00" filter="url(#ledGlow)">LIVE</text>
  </g>
</svg>

```

## svg-templates/batting.svg

```svg
<svg width="1000" height="250" viewBox="0 0 1000 250" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#000080" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#0082c4" stop-opacity="0.9" />
    </linearGradient>

    <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff9933" />
      <stop offset="100%" stop-color="#ffcc00" />
    </linearGradient>

    <style>
      .title { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800; font-size: 22px; fill: #ffffff; letter-spacing: 2px; }
      .lang-name { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 600; font-size: 16px; fill: #ffffff; }
      .lang-pct { font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 16px; fill: #ffffff; }
      
      @keyframes growBar {
        0% { transform: scaleX(0); }
        100% { transform: scaleX(1); }
      }
      .anim-bar { transform-origin: left center; animation: growBar 1.5s ease-out forwards; }
    </style>
  </defs>

  <!-- Broadcast Graphic Background -->
  <rect x="50" y="20" width="900" height="210" fill="url(#bgGrad)" rx="10" stroke="#ff9933" stroke-width="3" />
  
  <!-- Header -->
  <rect x="50" y="20" width="300" height="40" fill="#ff9933" rx="10" />
  <rect x="50" y="40" width="300" height="20" fill="#ff9933" /> <!-- Square bottom corners -->
  <text x="70" y="47" class="title" fill="#000080">BATTING AVERAGE</text>
  <text x="370" y="47" class="title" fill="#fff" font-size="16">(TOP LANGUAGES)</text>

  <!-- List of Languages -->
  <g transform="translate(80, 80)">
    <!-- Top 1 -->
    <text x="0" y="15" class="lang-name">{{LANG_1_NAME}}</text>
    <rect x="120" y="2" width="{{LANG_1_WIDTH}}" height="16" fill="url(#barGrad)" rx="3" class="anim-bar" style="animation-delay: 0.2s" />
    <text x="{{LANG_1_TXT_POS}}" y="15" class="lang-pct">{{LANG_1_PCT}}%</text>

    <!-- Top 2 -->
    <text x="0" y="45" class="lang-name">{{LANG_2_NAME}}</text>
    <rect x="120" y="32" width="{{LANG_2_WIDTH}}" height="16" fill="url(#barGrad)" rx="3" class="anim-bar" style="animation-delay: 0.4s" />
    <text x="{{LANG_2_TXT_POS}}" y="45" class="lang-pct">{{LANG_2_PCT}}%</text>

    <!-- Top 3 -->
    <text x="0" y="75" class="lang-name">{{LANG_3_NAME}}</text>
    <rect x="120" y="62" width="{{LANG_3_WIDTH}}" height="16" fill="url(#barGrad)" rx="3" class="anim-bar" style="animation-delay: 0.6s" />
    <text x="{{LANG_3_TXT_POS}}" y="75" class="lang-pct">{{LANG_3_PCT}}%</text>

    <!-- Top 4 -->
    <text x="0" y="105" class="lang-name">{{LANG_4_NAME}}</text>
    <rect x="120" y="92" width="{{LANG_4_WIDTH}}" height="16" fill="url(#barGrad)" rx="3" class="anim-bar" style="animation-delay: 0.8s" />
    <text x="{{LANG_4_TXT_POS}}" y="105" class="lang-pct">{{LANG_4_PCT}}%</text>

    <!-- Top 5 -->
    <text x="0" y="135" class="lang-name">{{LANG_5_NAME}}</text>
    <rect x="120" y="122" width="{{LANG_5_WIDTH}}" height="16" fill="url(#barGrad)" rx="3" class="anim-bar" style="animation-delay: 1.0s" />
    <text x="{{LANG_5_TXT_POS}}" y="135" class="lang-pct">{{LANG_5_PCT}}%</text>
  </g>
</svg>

```

## svg-templates/bowling.svg

```svg
<svg width="1000" height="250" viewBox="0 0 1000 250" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#020111" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#111" stop-opacity="0.9" />
    </linearGradient>

    <radialGradient id="ballGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff3333" />
      <stop offset="100%" stop-color="#800000" />
    </radialGradient>

    <style>
      .title { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800; font-size: 22px; fill: #ffffff; letter-spacing: 2px; }
      .tech-name { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 700; font-size: 16px; fill: #ffffff; text-transform: uppercase; }
      .tech-sub { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 400; font-size: 12px; fill: #aaa; text-transform: uppercase; }
      .speed { font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 20px; fill: #4caf50; }
      
      @keyframes bowlPath {
        0% { transform: translateX(0) scale(1); opacity: 0; }
        20% { opacity: 1; }
        100% { transform: translateX(-150px) scale(0.6); opacity: 0; }
      }
      .anim-ball { animation: bowlPath 2s infinite ease-out; }
    </style>
  </defs>

  <!-- Broadcast Graphic Background -->
  <rect x="50" y="20" width="900" height="210" fill="url(#bgGrad)" rx="10" stroke="#4caf50" stroke-width="3" />
  
  <!-- Header -->
  <rect x="50" y="20" width="300" height="40" fill="#4caf50" rx="10" />
  <rect x="50" y="40" width="300" height="20" fill="#4caf50" />
  <text x="70" y="47" class="title" fill="#020111">BOWLING ARSENAL</text>
  <text x="370" y="47" class="title" fill="#fff" font-size="16">(BACKEND &amp; CLOUD)</text>

  <!-- Arsenal Grid -->
  <g transform="translate(80, 80)">
    
    <!-- Item 1: Backend Framework -->
    <g transform="translate(0, 0)">
      <circle cx="15" cy="15" r="10" fill="url(#ballGlow)" />
      <circle cx="25" cy="15" r="10" fill="url(#ballGlow)" class="anim-ball" style="animation-delay: 0s" />
      <text x="40" y="15" class="tech-name">{{BOWLING_1_NAME}}</text>
      <text x="40" y="32" class="tech-sub">YORKER (FRAMEWORK)</text>
      <text x="180" y="20" class="speed">150 KPH</text>
    </g>

    <!-- Item 2: Database -->
    <g transform="translate(300, 0)">
      <circle cx="15" cy="15" r="10" fill="url(#ballGlow)" />
      <circle cx="25" cy="15" r="10" fill="url(#ballGlow)" class="anim-ball" style="animation-delay: 0.5s" />
      <text x="40" y="15" class="tech-name">{{BOWLING_2_NAME}}</text>
      <text x="40" y="32" class="tech-sub">BOUNCER (DATABASE)</text>
      <text x="180" y="20" class="speed">148 KPH</text>
    </g>

    <!-- Item 3: Cloud -->
    <g transform="translate(600, 0)">
      <circle cx="15" cy="15" r="10" fill="url(#ballGlow)" />
      <circle cx="25" cy="15" r="10" fill="url(#ballGlow)" class="anim-ball" style="animation-delay: 1.0s" />
      <text x="40" y="15" class="tech-name">{{BOWLING_3_NAME}}</text>
      <text x="40" y="32" class="tech-sub">GOOGLY (CLOUD)</text>
      <text x="180" y="20" class="speed">145 KPH</text>
    </g>

    <!-- Item 4: DevOps -->
    <g transform="translate(0, 70)">
      <circle cx="15" cy="15" r="10" fill="url(#ballGlow)" />
      <circle cx="25" cy="15" r="10" fill="url(#ballGlow)" class="anim-ball" style="animation-delay: 1.5s" />
      <text x="40" y="15" class="tech-name">{{BOWLING_4_NAME}}</text>
      <text x="40" y="32" class="tech-sub">INSWING (DEVOPS)</text>
      <text x="180" y="20" class="speed">142 KPH</text>
    </g>

    <!-- Item 5: AI/ML -->
    <g transform="translate(300, 70)">
      <circle cx="15" cy="15" r="10" fill="url(#ballGlow)" />
      <circle cx="25" cy="15" r="10" fill="url(#ballGlow)" class="anim-ball" style="animation-delay: 2.0s" />
      <text x="40" y="15" class="tech-name">{{BOWLING_5_NAME}}</text>
      <text x="40" y="32" class="tech-sub">DOOSRA (AI/ML)</text>
      <text x="180" y="20" class="speed">138 KPH</text>
    </g>

    <!-- Item 6: Tools -->
    <g transform="translate(600, 70)">
      <circle cx="15" cy="15" r="10" fill="url(#ballGlow)" />
      <circle cx="25" cy="15" r="10" fill="url(#ballGlow)" class="anim-ball" style="animation-delay: 2.5s" />
      <text x="40" y="15" class="tech-name">{{BOWLING_6_NAME}}</text>
      <text x="40" y="32" class="tech-sub">SLOWER BALL (TOOLS)</text>
      <text x="180" y="20" class="speed">115 KPH</text>
    </g>

  </g>
</svg>

```

## svg-templates/fixtures.svg

```svg
<svg width="1000" height="300" viewBox="0 0 1000 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ticketGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e0e0e0" />
    </linearGradient>

    <linearGradient id="stubGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff9933" />
      <stop offset="100%" stop-color="#cc7a00" />
    </linearGradient>

    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="2" dy="5" stdDeviation="3" flood-opacity="0.3" />
    </filter>

    <style>
      .title { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800; font-size: 24px; fill: #111; letter-spacing: 2px; }
      .proj-name { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800; font-size: 18px; fill: #000080; text-transform: uppercase; }
      .proj-desc { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 600; font-size: 12px; fill: #555; }
      .proj-stat { font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 14px; fill: #fff; }
      .ticket-title { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800; font-size: 12px; fill: #fff; letter-spacing: 1px; }
      
      @keyframes popIn {
        0% { transform: scale(0.9); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      .ticket { transform-origin: center; animation: popIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; }
    </style>
  </defs>

  <!-- Background (Pitch Green to match flow) -->
  <rect width="1000" height="300" fill="#2e7d32" />

  <!-- White border line for pitch marking -->
  <line x1="50" y1="30" x2="950" y2="30" stroke="#fff" stroke-width="4" />
  
  <rect x="300" y="10" width="400" height="40" fill="#fff" rx="20" />
  <text x="500" y="37" text-anchor="middle" class="title">TOURNAMENT FIXTURES</text>

  <!-- Tickets container -->
  <g transform="translate(50, 80)">
    
    <!-- Ticket 1 -->
    <g class="ticket" style="animation-delay: 0.2s">
      <!-- Main body -->
      <rect x="0" y="0" width="400" height="80" fill="url(#ticketGrad)" rx="8" filter="url(#shadow)" />
      <!-- Stub -->
      <rect x="320" y="0" width="80" height="80" fill="url(#stubGrad)" rx="8" />
      <rect x="315" y="0" width="10" height="80" fill="#2e7d32" stroke-dasharray="4,4" stroke="#fff" /> <!-- Perforation -->
      <!-- Cutouts -->
      <circle cx="320" cy="0" r="8" fill="#2e7d32" />
      <circle cx="320" cy="80" r="8" fill="#2e7d32" />
      
      <!-- Text -->
      <text x="20" y="30" class="proj-name">{{PROJ_1_NAME}}</text>
      <text x="20" y="55" class="proj-desc">{{PROJ_1_DESC}}</text>
      
      <text x="360" y="30" text-anchor="middle" class="ticket-title">STARS</text>
      <text x="360" y="55" text-anchor="middle" class="proj-stat">⭐ {{PROJ_1_STARS}}</text>
    </g>

    <!-- Ticket 2 -->
    <g transform="translate(450, 0)" class="ticket" style="animation-delay: 0.4s">
      <rect x="0" y="0" width="400" height="80" fill="url(#ticketGrad)" rx="8" filter="url(#shadow)" />
      <rect x="320" y="0" width="80" height="80" fill="url(#stubGrad)" rx="8" />
      <rect x="315" y="0" width="10" height="80" fill="#2e7d32" stroke-dasharray="4,4" stroke="#fff" />
      <circle cx="320" cy="0" r="8" fill="#2e7d32" />
      <circle cx="320" cy="80" r="8" fill="#2e7d32" />
      
      <text x="20" y="30" class="proj-name">{{PROJ_2_NAME}}</text>
      <text x="20" y="55" class="proj-desc">{{PROJ_2_DESC}}</text>
      
      <text x="360" y="30" text-anchor="middle" class="ticket-title">STARS</text>
      <text x="360" y="55" text-anchor="middle" class="proj-stat">⭐ {{PROJ_2_STARS}}</text>
    </g>

    <!-- Ticket 3 -->
    <g transform="translate(0, 110)" class="ticket" style="animation-delay: 0.6s">
      <rect x="0" y="0" width="400" height="80" fill="url(#ticketGrad)" rx="8" filter="url(#shadow)" />
      <rect x="320" y="0" width="80" height="80" fill="url(#stubGrad)" rx="8" />
      <rect x="315" y="0" width="10" height="80" fill="#2e7d32" stroke-dasharray="4,4" stroke="#fff" />
      <circle cx="320" cy="0" r="8" fill="#2e7d32" />
      <circle cx="320" cy="80" r="8" fill="#2e7d32" />
      
      <text x="20" y="30" class="proj-name">{{PROJ_3_NAME}}</text>
      <text x="20" y="55" class="proj-desc">{{PROJ_3_DESC}}</text>
      
      <text x="360" y="30" text-anchor="middle" class="ticket-title">STARS</text>
      <text x="360" y="55" text-anchor="middle" class="proj-stat">⭐ {{PROJ_3_STARS}}</text>
    </g>

    <!-- Ticket 4 -->
    <g transform="translate(450, 110)" class="ticket" style="animation-delay: 0.8s">
      <rect x="0" y="0" width="400" height="80" fill="url(#ticketGrad)" rx="8" filter="url(#shadow)" />
      <rect x="320" y="0" width="80" height="80" fill="url(#stubGrad)" rx="8" />
      <rect x="315" y="0" width="10" height="80" fill="#2e7d32" stroke-dasharray="4,4" stroke="#fff" />
      <circle cx="320" cy="0" r="8" fill="#2e7d32" />
      <circle cx="320" cy="80" r="8" fill="#2e7d32" />
      
      <text x="20" y="30" class="proj-name">{{PROJ_4_NAME}}</text>
      <text x="20" y="55" class="proj-desc">{{PROJ_4_DESC}}</text>
      
      <text x="360" y="30" text-anchor="middle" class="ticket-title">STARS</text>
      <text x="360" y="55" text-anchor="middle" class="proj-stat">⭐ {{PROJ_4_STARS}}</text>
    </g>

  </g>
</svg>

```

## svg-templates/footer.svg

```svg
<svg width="1000" height="150" viewBox="0 0 1000 150" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tickerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000080" />
      <stop offset="100%" stop-color="#020111" />
    </linearGradient>

    <style>
      .ticker-bg { fill: url(#tickerGrad); stroke: #ff9933; stroke-width: 2; }
      .ticker-text { font-family: 'Segoe UI', Arial, sans-serif; font-weight: 600; font-size: 16px; fill: #ffffff; }
      .highlight { fill: #ff9933; font-weight: 800; }
      
      @keyframes scrollTicker {
        0% { transform: translateX(1000px); }
        100% { transform: translateX(-1500px); }
      }
      .scroll { animation: scrollTicker 15s linear infinite; }
      
      .bottom-bar { font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 14px; fill: #aaa; }
    </style>
  </defs>

  <!-- Main Ticker Bar -->
  <rect x="50" y="20" width="900" height="50" class="ticker-bg" rx="5" />
  
  <!-- "LIVE" badge -->
  <rect x="50" y="20" width="80" height="50" fill="#cc0000" rx="5" />
  <rect x="120" y="20" width="10" height="50" fill="#cc0000" /> <!-- Square edge on right -->
  <text x="90" y="52" text-anchor="middle" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="18" fill="#fff">LIVE</text>

  <!-- Scrolling Commentary -->
  <!-- We use a clip path to restrict text within the ticker area -->
  <clipPath id="tickerClip">
    <rect x="135" y="20" width="765" height="50" />
  </clipPath>
  
  <g clip-path="url(#tickerClip)">
    <text x="0" y="51" class="ticker-text scroll">
      <tspan class="highlight">COMMENTARY:</tspan> 🎙️ "What a spectacular deployment! Absolutely flawless..." 🏏 
      <tspan class="highlight">UPDATE:</tspan> The commit history shows great consistency! 🌟 
      <tspan class="highlight">EXPERT ANALYSIS:</tspan> Watch out for the new features coming in the next sprint... 🚀
    </text>
  </g>

  <!-- Bottom Stats / Visitors -->
  <rect x="50" y="80" width="900" height="40" fill="#111" rx="5" />
  
  <text x="100" y="105" class="bottom-bar">PROFILE STATUS: <tspan fill="#4caf50">ACTIVE</tspan></text>
  <text x="400" y="105" class="bottom-bar">CURRENT FORM: <tspan fill="#ff9933">EXCELLENT</tspan></text>
  <text x="700" y="105" class="bottom-bar">GOAL: <tspan fill="#fff">WORLD CLASS CODE</tspan></text>

</svg>

```

