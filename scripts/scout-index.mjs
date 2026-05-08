import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const SRC_DIR = './src';
const OUTPUT_FILE = './CODEBASE.md';
const WATERMARK_FILE = './.scout-watermark';

async function walk(dir) {
  let files = [];
  const list = await fs.readdir(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      files = files.concat(await walk(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      files.push(filePath);
    }
  }
  return files;
}

function getCommitInfo(filePath) {
  try {
    // Use git rev-list --count for cross-platform commit counting
    const churn = execSync(`git rev-list --count HEAD -- "${filePath}"`, { encoding: 'utf-8' }).trim();
    return parseInt(churn) || 1;
  } catch (e) {
    return 1;
  }
}

function getRecentCommits() {
  try {
    return execSync('git log --oneline -n 10 -- src/', { encoding: 'utf-8' }).trim();
  } catch (e) {
    return 'No git history found.';
  }
}

async function analyzeFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const lineCount = lines.length;

  // Extract exports
  const exportRegex = /^export\s+(function|const|class|type|interface|enum|default)\s+(\w+)/gm;
  const exports = [];
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[2]);
  }

  // Extract internal imports
  const importRegex = /from\s+['"](\.\.?\/[^'"]+)['"]/g;
  const imports = [];
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // Check for test sibling
  const testPath = filePath.replace(/\.tsx?$/, '.test.ts');
  let hasTest = false;
  try {
    await fs.access(testPath);
    hasTest = true;
  } catch (e) {}

  return {
    path: filePath.replace(/\\/g, '/'),
    exports: exports.slice(0, 5), // Limit to top 5 for brevity
    lineCount,
    imports,
    hasTest,
    churn: getCommitInfo(filePath)
  };
}

async function run() {
  console.log('🚀 Cascade Scout: Indexing codebase...');
  const files = await walk(SRC_DIR);
  const fileData = await Promise.all(files.map(analyzeFile));

  // Build dependency graph (directory level)
  const dirDeps = {};
  fileData.forEach(file => {
    const dir = path.dirname(file.path).replace('src/', '') || 'root';
    if (!dirDeps[dir]) dirDeps[dir] = new Set();
    file.imports.forEach(imp => {
      if (imp.startsWith('.')) {
        const targetDir = path.dirname(path.join(path.dirname(file.path), imp)).replace('src/', '') || 'root';
        if (targetDir !== dir && targetDir !== '.') {
           dirDeps[dir].add(targetDir);
        }
      }
    });
  });

  // Hub Files (Fan-in)
  const fanIn = {};
  fileData.forEach(file => {
    file.imports.forEach(imp => {
      // Very crude resolution
      const target = imp.replace(/^\.\//, path.dirname(file.path) + '/').replace(/^\.\.\//, path.dirname(path.dirname(file.path)) + '/');
      fanIn[target] = (fanIn[target] || 0) + 1;
    });
  });

  const sortedHubs = Object.entries(fanIn)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Hotspots
  const hotspots = fileData
    .map(f => ({ ...f, score: f.lineCount * f.churn }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const timestamp = new Date().toISOString();
  const commit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();

  let markdown = `# CODEBASE — Auto-Generated Index\n`;
  markdown += `> Generated: ${timestamp} | Commit: ${commit} | Run: \`npm run scout\`\n\n`;

  markdown += `## Module Map\n`;
  markdown += `| Path | Exports | Lines | Test? |\n`;
  markdown += `|------|---------|-------|-------|\n`;
  fileData.sort((a, b) => a.path.localeCompare(b.path)).forEach(f => {
    markdown += `| ${f.path} | ${f.exports.join(', ')}${f.exports.length > 5 ? '...' : ''} | ${f.lineCount} | ${f.hasTest ? '✓' : '—'} |\n`;
  });

  markdown += `\n## Dependency Graph (Directory Level)\n`;
  markdown += `\`\`\`mermaid\ngraph LR\n`;
  Object.entries(dirDeps).forEach(([dir, deps]) => {
    deps.forEach(dep => {
      markdown += `  ${dir.replace(/[\/\.-]/g, '_')} --> ${dep.replace(/[\/\.-]/g, '_')}\n`;
    });
  });
  markdown += `\`\`\`\n\n`;

  markdown += `## Hub Files (Most Imported)\n`;
  sortedHubs.forEach(([path, count]) => {
    markdown += `- ${path} (${count} imports)\n`;
  });

  markdown += `\n## Hotspots (Size × Churn)\n`;
  markdown += `| File | Lines | Commits | Risk |\n`;
  markdown += `|------|-------|---------|------|\n`;
  hotspots.forEach(f => {
    const risk = f.score > 5000 ? '🔴' : f.score > 2000 ? '🟡' : '🟢';
    markdown += `| ${f.path} | ${f.lineCount} | ${f.churn} | ${risk} |\n`;
  });

  markdown += `\n## Recent Changes (Last 10 Merges/Commits)\n`;
  markdown += `\`\`\`\n${getRecentCommits()}\n\`\`\`\n`;

  await fs.writeFile(OUTPUT_FILE, markdown);
  await fs.writeFile(WATERMARK_FILE, JSON.stringify({ commit, timestamp }));

  console.log(`✅ Scout Index generated: ${OUTPUT_FILE}`);
}

run().catch(console.error);
