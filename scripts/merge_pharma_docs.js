#!/usr/bin/env node
/**
 * 合并药品法规文档并构建索引
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pharmaDir = path.join(__dirname, '..', 'data', 'articles', 'pharma_regulatory');
const outputFile = path.join(__dirname, '..', 'data', 'articles', 'pharma_regulatory_merged.md');
const indexFile = path.join(__dirname, '..', 'data', 'articles', 'pharma_regulatory_index.json');

// 读取所有 markdown 文件
console.log('📂 读取药品法规文档...');

const files = fs.readdirSync(pharmaDir)
  .filter(f => f.endsWith('.md') && f !== '00_药品法规总览.md')
  .sort();

console.log(`   找到 ${files.length} 个文档`);

// 合并文档
let mergedContent = `# 药品法规知识库

**导入时间**: ${new Date().toISOString()}
**文档总数**: ${files.length}

---

`;

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const content = fs.readFileSync(path.join(pharmaDir, file), 'utf-8');
  mergedContent += `\n## [${i + 1}] ${file}\n\n${content}\n\n---\n\n`;
  
  if ((i + 1) % 200 === 0) {
    console.log(`   进度: ${i + 1}/${files.length}`);
  }
}

// 保存合并后的文档
fs.writeFileSync(outputFile, mergedContent, 'utf-8');
console.log(`✅ 已保存合并文档: ${outputFile}`);
console.log(`   文件大小: ${(mergedContent.length / 1024 / 1024).toFixed(2)} MB`);

console.log('\n📝 接下来运行 tree.mjs 构建索引:');
console.log(`   node src/tree.mjs "${outputFile}" "${indexFile}"`);