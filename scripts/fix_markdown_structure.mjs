#!/usr/bin/env node
/**
 * 预处理 pharma_regulatory_merged.md
 * 将 ## [N] xxx.md 改为 ### [N] xxx.md
 * 这样 # 19881227_xxx 就会成为其子节点
 */

import fs from 'fs';
import path from 'path';

const inputPath = 'data/articles/pharma_regulatory_merged.md';
const outputPath = 'data/articles/pharma_regulatory_merged_fixed.md';

console.log('📖 读取文档...');
const content = fs.readFileSync(inputPath, 'utf-8');

console.log('🔧 预处理文档...');
const lines = content.split('\n');
const processedLines = [];

for (const line of lines) {
  // 将 ## [N] xxx.md 替换为 ### [N] xxx.md
  const match = line.match(/^##\s+\[(\d+)\]\s+(.+\.md)$/);
  if (match) {
    const num = match[1];
    const filename = match[2];
    processedLines.push(`### [${num}] ${filename}`);
    console.log(`   转换: ## [${num}] ${filename} -> ### [${num}] ${filename}`);
  } 
  // 将 # YYYYMMDD_xxx (文档标题) 替换为 #### YYYYMMDD_xxx
  else if (line.match(/^#\s+\d{8}_[^\s]/)) {
    processedLines.push(line.replace(/^#\s+/, '#### '));
    console.log(`   转换: ${line.trim()} -> #### ${line.trim().substring(2)}`);
  } 
  else {
    processedLines.push(line);
  }
}

console.log('💾 保存文档...');
fs.writeFileSync(outputPath, processedLines.join('\n'), 'utf-8');

console.log(`✅ 完成！输出文件: ${outputPath}`);
console.log(`   原始行数: ${lines.length}`);
console.log(`   处理后行数: ${processedLines.length}`);