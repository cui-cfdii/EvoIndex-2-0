#!/usr/bin/env node
/**
 * PageIndex-CN 检索树构建器
 * 对 Markdown 文档构建层次化检索树
 */

import fs from 'fs';
import path from 'path';

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
      currentLevel = level;  // ← 修复：更新当前层级
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
function buildIndex(inputPath, outputPath) {
  console.log('📖 读取文档:', inputPath);

  const content = fs.readFileSync(inputPath, 'utf-8');
  const tree = parseMarkdown(content);

  console.log('🌳 构建检索树...');
  console.log(`   - 标题: ${tree.title}`);
  console.log(`   - 节点数: ${countNodes(tree.root)}`);

  // 保存索引
  fs.writeFileSync(outputPath, JSON.stringify(tree, null, 2), 'utf-8');
  console.log(`✅ 索引已保存: ${outputPath}`);
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

// 主程序
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('用法: node tree.mjs <input.md> <output.json>');
  process.exit(1);
}

const [inputPath, outputPath] = args;
buildIndex(inputPath, outputPath);