#!/usr/bin/env node
/**
 * 文档解析器
 * 支持多种文档格式
 */

/**
 * 解析 Markdown 文档
 */
export function parseMarkdown(content) {
  const sections = [];
  const lines = content.split('\n');
  let currentSection = null;

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      // 保存上一节
      if (currentSection) {
        sections.push(currentSection);
      }

      // 开始新节
      currentSection = {
        level: match[1].length,
        title: match[2].trim(),
        content: ''
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * 提取上下文
 */
export function extractContext(sections, sectionIndex, contextSize = 2) {
  const start = Math.max(0, sectionIndex - contextSize);
  const end = Math.min(sections.length, sectionIndex + contextSize + 1);

  return sections.slice(start, end);
}

/**
 * 读取文档
 */
export function readDocument(filePath) {
  const fs = require('fs');
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    content,
    sections: parseMarkdown(content)
  };
}

// 测试
if (process.argv[1] && process.argv[1].endsWith('parser.mjs')) {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const doc = readDocument(args[0]);
    console.log(`📄 文档加载成功`);
    console.log(`   - 章节数: ${doc.sections.length}`);
    console.log('\n章节列表:');
    doc.sections.forEach((section, i) => {
      console.log(`${i + 1}. ${'#'.repeat(section.level)} ${section.title}`);
    });
  }
}