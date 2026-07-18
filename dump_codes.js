const fs = require('fs');
const path = require('path');

const filesToInclude = [
  'README.md',
  'scripts/generate_readme.js',
  'deploy.js',
  '.github/workflows/update-readme.yml',
  'svg-templates/hero.svg',
  'svg-templates/scoreboard.svg',
  'svg-templates/batting.svg',
  'svg-templates/bowling.svg',
  'svg-templates/fixtures.svg',
  'svg-templates/footer.svg'
];

let output = '# All Source Codes for Cricket Profile README\n\n';

for (const file of filesToInclude) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(file).substring(1);
    const lang = ext === 'js' ? 'javascript' : ext === 'yml' ? 'yaml' : ext === 'md' ? 'markdown' : ext;
    
    output += `## ${file}\n\n`;
    output += '```' + lang + '\n';
    output += content;
    output += '\n```\n\n';
  } else {
    output += `## ${file}\n\n(File not found)\n\n`;
  }
}

fs.writeFileSync(path.join(__dirname, 'all_codes.md'), output);
console.log('Created all_codes.md successfully!');
