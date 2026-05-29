import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = getAllFiles(srcDir);
let markdown = '# Cascade Codebase Overview\n\n';

for (const file of allFiles) {
  const relativePath = path.relative(srcDir, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n').length;
  
  // Very basic regex to find imports and exports
  const imports = [...content.matchAll(/import\s+.*?from\s+['"](.*?)['"]/g)].map(m => m[1]);
  const functions = [...content.matchAll(/(?:export\s+)?(?:function|const)\s+([a-zA-Z0-9_]+)\s*(?:=|:\s*React\.FC|\()/g)].map(m => m[1]);
  const interfaces = [...content.matchAll(/(?:export\s+)?(?:interface|type)\s+([a-zA-Z0-9_]+)/g)].map(m => m[1]);
  
  markdown += `## \`${relativePath}\`\n`;
  markdown += `- **Size**: ${lines} lines\n`;
  if (imports.length > 0) markdown += `- **Imports**: ${[...new Set(imports)].join(', ')}\n`;
  if (functions.length > 0) markdown += `- **Functions**: ${[...new Set(functions)].join(', ')}\n`;
  if (interfaces.length > 0) markdown += `- **Types/Interfaces**: ${[...new Set(interfaces)].join(', ')}\n`;
  
  // Try to generate a brief summary based on the path
  let summary = 'General utility or component.';
  if (relativePath.startsWith('simulation/phases')) summary = 'Phase logic for the simulation tick engine. Mutates world state.';
  else if (relativePath.startsWith('engine')) summary = 'Rendering engine logic, PixiJS layers, and camera management.';
  else if (relativePath.startsWith('store')) summary = 'Zustand global state slice.';
  else if (relativePath.startsWith('ui')) summary = 'React UI component.';
  else if (relativePath.startsWith('world')) summary = 'World generation, terrain, factions, and initial state setup.';
  
  markdown += `- **Summary**: ${summary}\n\n`;
}

const outPath = path.resolve(__dirname, '../codebase_analysis.md');
fs.writeFileSync(outPath, markdown);
console.log('Analysis written to ' + outPath);
