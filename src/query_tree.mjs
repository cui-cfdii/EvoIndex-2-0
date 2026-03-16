#!/usr/bin/env node
/**
 * 检索树查询引擎
 * 基于本地 LLM 进行智能查询
 */

import fs from 'fs';
import { parseMarkdown } from './parser.mjs';

/**
 * 加载索引
 */
function loadIndex(indexPath) {
  const content = fs.readFileSync(indexPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * 在树中搜索节点
 */
function searchTree(node, keywords) {
  const results = [];

  // 搜索当前节点
  const titleMatch = keywords.some(kw =>
    node.title.toLowerCase().includes(kw.toLowerCase())
  );
  const contentMatch = keywords.some(kw =>
    node.content.toLowerCase().includes(kw.toLowerCase())
  );

  if (titleMatch || contentMatch) {
    results.push({
      title: node.title,
      level: node.level,
      content: node.content,
      matchType: titleMatch ? 'title' : 'content'
    });
  }

  // 递归搜索子节点
  for (const child of node.children) {
    results.push(...searchTree(child, keywords));
  }

  return results;
}

/**
 * 查询索引
 */
function queryIndex(indexPath, query) {
  console.log('🔍 查询:', query);

  const tree = loadIndex(indexPath);
  const keywords = query.split(/\s+/);

  console.log('🌳 搜索检索树...');
  const results = searchTree(tree.root, keywords);

  console.log(`✅ 找到 ${results.length} 个匹配项\n`);

  if (results.length === 0) {
    console.log('未找到匹配内容');
    return;
  }

  // 显示结果
  results.forEach((result, i) => {
    console.log(`${i + 1}. ${'#'.repeat(result.level)} ${result.title}`);
    console.log(`   匹配类型: ${result.matchType === 'title' ? '标题' : '内容'}`);

    // 显示上下文片段
    const snippet = result.content.trim().slice(0, 200);
    if (snippet) {
      console.log(`   片段: ${snippet}...`);
    }
    console.log();
  });
}

// 主程序
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('用法: node query_tree.mjs "<query>" <index.json>');
  process.exit(1);
}

const [query, indexPath] = args;
queryIndex(indexPath, query);