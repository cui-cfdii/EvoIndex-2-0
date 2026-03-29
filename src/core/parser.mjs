#!/usr/bin/env node
/**
 * 文档解析器
 * 支持 Markdown 和 PDF 双格式
 */

import fs from 'fs';
import { createPDFParser } from './pdf_parser.mjs';

/**
 * 检测文档类型
 * @param {string} filePath - 文件路径
 * @returns {string} 文档类型 ('markdown' | 'pdf')
 */
export function detectDocumentType(filePath) {
  const ext = filePath.toLowerCase().split('.').pop();
  if (ext === 'pdf') {
    return 'pdf';
  }
  return 'markdown';
}

/**
 * 解析文档（自动检测类型）
 * @param {string} filePath - 文件路径
 * @param {Object} options - 解析选项
 * @returns {Promise<Object>} 解析结果
 */
export async function parseDocument(filePath, options = {}) {
  const docType = detectDocumentType(filePath);

  if (docType === 'pdf') {
    return await parsePDF(filePath, options);
  } else {
    return await parseMarkdownFile(filePath, options);
  }
}

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
 * 读取文档（向后兼容）
 */
export function readDocument(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    content,
    sections: parseMarkdown(content)
  };
}

/**
 * 解析 Markdown 文件
 * @param {string} filePath - Markdown 文件路径
 * @param {Object} options - 解析选项
 * @returns {Promise<Object>} 解析结果
 */
export async function parseMarkdownFile(filePath, options = {}) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    type: 'markdown',
    content,
    sections: parseMarkdown(content),
    metadata: {
      engine: 'native',
      file_path: filePath,
      format: 'markdown'
    },
    errors: []
  };
}

/**
 * 解析 PDF 文件
 * @param {string} filePath - PDF 文件路径
 * @param {Object} options - 解析选项
 * @returns {Promise<Object>} 解析结果
 */
export async function parsePDF(filePath, options = {}) {
  const parser = createPDFParser(options);

  const result = await parser.parse(filePath);

  // 将 PDF 内容转换为 Markdown 格式（兼容现有系统）
  const markdownContent = convertPDFContentToMarkdown(result.content);

  return {
    type: 'pdf',
    content: markdownContent,
    sections: parseMarkdown(markdownContent),
    metadata: {
      ...result.metadata,
      format: 'pdf',
      converted_to_markdown: true
    },
    errors: result.errors
  };
}

/**
 * 将 PDF 内容转换为 Markdown 格式
 * @param {string|Array} pdfContent - PDF 原始内容（字符串或内容数组）
 * @returns {string} Markdown 格式内容
 */
function convertPDFContentToMarkdown(pdfContent) {
  // 如果已经是 Markdown，直接返回
  if (typeof pdfContent === 'string' && pdfContent.trim().startsWith('#')) {
    return pdfContent;
  }

  // 处理内容数组格式（来自 PyMuPDF）
  if (Array.isArray(pdfContent)) {
    let markdown = '';

    for (const item of pdfContent) {
      if (item.text) {
        markdown += `## Page ${item.page}\n\n${item.text}\n\n`;
      }
    }

    return markdown.trim();
  }

  // 处理字符串格式
  if (typeof pdfContent === 'string') {
    const lines = pdfContent.split('\n');
    let markdown = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        markdown += trimmed + '\n\n';
      }
    }

    return markdown.trim();
  }

  return '';
}

// 测试
if (process.argv[1] && process.argv[1].endsWith('parser.mjs')) {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    parseDocument(args[0], { verbose: true })
      .then(doc => {
        console.log(`📄 文档加载成功 (${doc.type})`);
        console.log(`   - 引擎: ${doc.metadata.engine}`);
        if (doc.metadata.page_count) {
          console.log(`   - 页数: ${doc.metadata.page_count}`);
        }
        console.log(`   - 章节数: ${doc.sections.length}`);
        console.log(`   - 内容长度: ${doc.content.length} 字符`);
        console.log('\n章节列表:');
        doc.sections.forEach((section, i) => {
          console.log(`${i + 1}. ${'#'.repeat(section.level)} ${section.title}`);
        });
      })
      .catch(error => {
        console.error(`❌ 解析失败: ${error.message}`);
        process.exit(1);
      });
  } else {
    console.log('用法: node parser.mjs <document_file>\n支持的格式: .md, .pdf');
  }
}