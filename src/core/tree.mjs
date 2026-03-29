#!/usr/bin/env node
/**
 * EvoIndex-2.0 检索树构建器
 * 支持 Markdown 和 PDF 文档
 */

import fs from 'fs';
import path from 'path';
import { parseDocument } from './parser.mjs';

/**
 * 解析 Markdown 文档，提取章节结构
 */
function parseMarkdown(content) {
  const lines = content.split('\n');
  const tree = {
    title: '',
    root: {
      title: 'Root',
      level: 0,
      children: [],
      content: ''
    }
  };

  let currentLevel = 0;
  const levelMap = { 0: tree.root };

  for (const line of lines) {
    // 匹配 Markdown 标题
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();

      if (!tree.title) {
        tree.title = title;
      }

      // 创建新节点
      const node = {
        title,
        level,
        children: [],
        content: ''
      };

      // 找到父节点
      let parent = levelMap[0];
      for (let l = level - 1; l >= 0; l--) {
        if (levelMap[l]) {
          parent = levelMap[l];
          break;
        }
      }

      parent.children.push(node);
      levelMap[level] = node;
    } else {
      // 添加内容到当前节点
      const currentNode = levelMap[currentLevel] || tree.root;
      currentNode.content += line + '\n';
    }
  }

  return tree;
}

/**
 * 构建检索树
 */
async function buildIndex(inputPath, outputPath, options = {}) {
  console.log('📖 读取文档:', inputPath);

  try {
    // 使用统一的文档解析器
    const doc = await parseDocument(inputPath, options);

    console.log(`📄 文档类型: ${doc.type}`);
    console.log(`   - 引擎: ${doc.metadata.engine}`);
    if (doc.metadata.page_count) {
      console.log(`   - 页数: ${doc.metadata.page_count}`);
    }

    const tree = parseMarkdown(doc.content);

    console.log('🌳 构建检索树...');
    console.log(`   - 标题: ${tree.title}`);
    console.log(`   - 节点数: ${countNodes(tree.root)}`);

    // 保存索引（包含原始文档元数据）
    const output = {
      tree,
      metadata: {
        ...doc.metadata,
        index_version: '2.0',
        indexed_at: new Date().toISOString()
      }
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`✅ 索引已保存: ${outputPath}`);

    return output;
  } catch (error) {
    console.error(`❌ 构建索引失败: ${error.message}`);
    throw error;
  }
}

/**
 * 统计节点数
 */
function countNodes(node) {
  let count = 1;
  for (const child of node.children) {
    count += countNodes(child);
  }
  return count;
}

// 导出
export { parseMarkdown, buildIndex, countNodes };

// 主程序
if (process.argv[1] && process.argv[1].endsWith('tree.mjs')) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('用法: node tree.mjs <input_file> <output.json> [--engine opendataloader|mineru]');
    console.log('');
    console.log('支持的格式: .md, .pdf');
    console.log('选项:');
    console.log('  --engine <name>  PDF 解析引擎 (opendataloader, mineru)');
    console.log('  --use-gpu        使用 GPU 加速 (仅 MinerU)');
    console.log('  --verbose        详细输出');
    process.exit(1);
  }

  const [inputPath, outputPath] = args;

  // 解析选项
  const options = {};
  const engineIndex = args.indexOf('--engine');
  if (engineIndex !== -1 && args[engineIndex + 1]) {
    options.engine = args[engineIndex + 1];
  }

  if (args.includes('--use-gpu')) {
    options.useGPU = true;
  }

  if (args.includes('--verbose')) {
    options.verbose = true;
  }

  buildIndex(inputPath, outputPath, options).catch(error => {
    process.exit(1);
  });
}