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
