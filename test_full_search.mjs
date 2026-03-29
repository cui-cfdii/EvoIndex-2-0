#!/usr/bin/env node
/**
 * 完整测试：本地 LLM + EvoIndex 2.0 知识库检索
 */

import fs from 'fs';

const url = 'http://172.16.8.69:11434/v1/chat/completions';
const query = '临床试验时adr数据漏记，违反哪些规定，如何处理';

console.log('🔍 查询:', query);
console.log('='.repeat(50));

// 步骤 1: 意图识别
const rewritePrompt = `分析查询"${query}"，提取JSON:
{"intent":"意图","keywords":["词1","词2"],"expanded_queries":["变体1"]}`;

const r1 = await fetch(url, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    model: 'qwen/qwen3.5-9b',
    messages: [{role: 'user', content: rewritePrompt}],
    max_tokens: 1000,
    temperature: 0.3
  })
});

const d1 = await r1.json();
const intentResult = d1.choices[0].message.reasoning_content;
console.log('📊 意图识别:', intentResult?.substring(0, 300));

// 解析关键词
let keywords = ['临床试验', 'adr', '不良反应', '违规', 'gcp', '处罚'];
try {
  const jsonMatch = intentResult.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.keywords) keywords = [...keywords, ...parsed.keywords];
    if (parsed.expanded_queries) keywords = [...keywords, ...parsed.expanded_queries];
  }
} catch(e) {}

// 步骤 2: 知识库检索
console.log('\n🔍 检索知识库...');

const index = JSON.parse(fs.readFileSync('data/articles/pharma_regulatory_index.json', 'utf-8'));

function searchTree(node, keywords, results = [], maxResults = 5) {
  if (results.length >= maxResults) return results;
  const titleMatch = keywords.some(kw => node.title && node.title.toLowerCase().includes(kw.toLowerCase()));
  const contentMatch = keywords.some(kw => node.content && node.content.toLowerCase().includes(kw.toLowerCase()));
  if (titleMatch || contentMatch) results.push({title: node.title, matchType: titleMatch?'title':'content', content: node.content?.trim().substring(0, 500)});
  if (node.children) for (const child of node.children) searchTree(child, keywords, results, maxResults);
  return results;
}

const results = searchTree(index.root, keywords);
console.log('✅ 找到', results.length, '条相关法规');

results.forEach((r, i) => {
  console.log(`  ${i+1}. ${r.title?.substring(0, 50)}`);
});

// 步骤 3: 生成答案
console.log('\n📝 生成答案...');

const context = results.map(r => r.content).join('\n\n');
const answerPrompt = `基于知识库内容回答：${query}

知识库：
${context}

列出违反的具体规定和处理方式。`;

const r2 = await fetch(url, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    model: 'qwen/qwen3.5-9b',
    messages: [{role: 'user', content: answerPrompt}],
    max_tokens: 3000,
    temperature: 0.3
  })
});

const d2 = await r2.json();
const answer = d2.choices[0].message.reasoning_content;

console.log('\n' + '='.repeat(50));
console.log('📋 最终答案:');
console.log('='.repeat(50));
console.log(answer);