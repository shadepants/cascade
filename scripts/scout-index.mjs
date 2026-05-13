import fs from 'fs/promises';
import path from 'path';
import { execFileSync } from 'child_process';

const SRC_DIR = './src';
const OUTPUT_FILE = './CODEBASE.md';
const WATERMARK_FILE = './.scout-watermark';
const scoutWarnings = new Set();

function addScoutWarning(message) {
  if (!scoutWarnings.has(message)) {
    scoutWarnings.add(message);
    console.warn(`⚠️ Scout: ${message}`);
  }
}

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

function isShallowRepository() {
  try {
    return execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf-8' }).trim() === 'true';
  } catch (e) {
    addScoutWarning('Unable to determine git repository depth. Hotspot churn data may be incomplete.');
    return false;
  }
}

function getCommitInfo(filePath, shallowRepo) {
  if (shallowRepo) {
    return null;
  }

  try {
    const gitPath = filePath.replace(/\\/g, '/');
    const churn = execFileSync('git', ['rev-list', '--count', 'HEAD', '--', gitPath], { encoding: 'utf-8' }).trim();
    const parsed = Number.parseInt(churn, 10);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }

    addScoutWarning(`Unable to parse churn count for ${gitPath}.`);
    return null;
  } catch (e) {
    addScoutWarning('Unable to read git churn history. Hotspot analysis will use N/A for commit counts.');
    return null;
  }
}

function getRecentCommits() {
  try {
    return execFileSync('git', ['log', '--oneline', '-n', '10', '--', 'src/'], { encoding: 'utf-8' }).trim();
  } catch (e) {
    return 'No git history found.';
  }
}

async function analyzeFile(filePath, shallowRepo) {
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
    churn: getCommitInfo(filePath, shallowRepo)
  };
}

async function run() {
  console.log('🚀 Cascade Scout: Indexing codebase...');
  const files = await walk(SRC_DIR);
  const shallowRepo = isShallowRepository();
  if (shallowRepo) {
    addScoutWarning('Repository has shallow git history. Hotspot churn and recent change data may be incomplete.');
  }
  const fileData = await Promise.all(files.map(file => analyzeFile(file, shallowRepo)));

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
    .map(f => ({ ...f, score: typeof f.churn === 'number' ? f.lineCount * f.churn : null }))
    .sort((a, b) => {
      if (a.score === null && b.score === null) {
        return b.lineCount - a.lineCount;
      }
      return (b.score ?? -1) - (a.score ?? -1);
    })
    .slice(0, 10);

  const timestamp = new Date().toISOString();
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).trim();

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

  if (scoutWarnings.size > 0) {
    markdown += `\n## Analysis Warnings\n`;
    for (const warning of scoutWarnings) {
      markdown += `- ${warning}\n`;
    }
  }

  markdown += `\n## Hotspots (Size × Churn)\n`;
  markdown += `| File | Lines | Commits | Risk |\n`;
  markdown += `|------|-------|---------|------|\n`;
  hotspots.forEach(f => {
    const risk = f.score === null ? '⚪' : f.score > 5000 ? '🔴' : f.score > 2000 ? '🟡' : '🟢';
    const churnDisplay = f.churn === null ? 'N/A' : f.churn;
    markdown += `| ${f.path} | ${f.lineCount} | ${churnDisplay} | ${risk} |\n`;
  });

  markdown += `\n## Recent Changes (Last 10 Merges/Commits)\n`;
  markdown += `\`\`\`\n${getRecentCommits()}\n\`\`\`\n`;

  await fs.writeFile(OUTPUT_FILE, markdown);
  await fs.writeFile(WATERMARK_FILE, JSON.stringify({ commit, timestamp }));

  console.log(`✅ Scout Index generated: ${OUTPUT_FILE}`);
}

run().catch(console.error);
