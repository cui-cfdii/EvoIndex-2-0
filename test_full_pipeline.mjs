#!/usr/bin/env node
/**
 * 测试本地 LLM + EvoIndex 2.0 知识库检索
 * 意图识别 + 查询优化 + 知识库检索
 */

const url = 'http://172.16.8.69:11434/v1/chat/completions';
const query = '临床试验时adr数据漏记，违反哪些规定，如何处理';

// 步骤 1: 意图识别与查询优化
const rewritePrompt = `你是一个查询优化专家。分析以下查询，提取意图、关键词和同义词。

查询：${query}

只输出JSON格式：
{"intent":"意图描述","expanded_queries":["变体1","变体2"],"keywords":["词1","词2"],"synonyms":{"原词":["同义词"]}}`;

console.log('🔄 步骤 1: 意图识别与查询优化...\n');

const rewriteBody = {
  model: 'qwen/qwen3.5-9b',
  messages: [{role: 'user', content: rewritePrompt}],
  max_tokens: 2000,
  temperature: 0.3,
  stream: false
};

let rewriteResult = await fetch(url, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(rewriteBody)
});

let rewriteData = await rewriteResult.json();
const rewriteContent = rewriteData.choices[0].message.reasoning_content || rewriteData.choices[0].message.content;
console.log('📊 意图识别结果:');
console.log(rewriteContent);

// 解析 JSON
let rewriteJson = {};
try {
  const jsonMatch = rewriteContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    rewriteJson = JSON.parse(jsonMatch[0]);
  }
} catch (e) {
  console.log('解析失败，使用原始查询');
}

// 步骤 2: 使用 EvoIndex 2.0 检索知识库
console.log('\n🔍 步骤 2: EvoIndex 2.0 知识库检索...');

// 使用扩展查询进行检索
const searchTerms = rewriteJson.keywords || [query];

// 导入 EvoIndex 模块
import('./src/query_tree.mjs').then(async (module) => {
  // 这里我们直接用简单的方式搜索
  const fs = await import('fs');
  
  // 读取合并后的知识库
  const indexPath = 'data/articles/pharma_regulatory_index.json';
  
  if (!fs.existsSync(indexPath)) {
    console.log('❌ 索引文件不存在');
    return;
  }
  
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  
  // 搜索函数
  function searchTree(node, keywords, results = []) {
    const titleMatch = keywords.some(kw => 
      node.title.toLowerCase().includes(kw.toLowerCase())
    );
    const contentMatch = keywords.some(kw => 
      node.content && node.content.toLowerCase().includes(kw.toLowerCase())
    );
    
    if (titleMatch || contentMatch) {
      results.push({
        title: node.title,
        level: node.level,
        matchType: titleMatch ? 'title' : 'content',
        content: node.content?.trim().substring(0, 300)
      });
    }
    
    if (node.children) {
      for (const child of node.children) {
        searchTree(child, keywords, results);
      }
    }
    
    return results;
  }
  
  const results = searchTree(index.root, searchTerms);
  
  console.log(`\n✅ 找到 ${results.length} 个匹配项\n`);
  
  // 显示前 5 个结果
  results.slice(0, 5).forEach((r, i) => {
    console.log(`${i+1}. ${r.title}`);
    console.log(`   匹配: ${r.matchType}`);
    if (r.content) {
      console.log(`   内容: ${r.content}...`);
    }
    console.log('');
  });
  
  // 步骤 3: 使用 LLM 生成最终答案
  console.log('📝 步骤 3: 生成答案...\n');
  
  const context = results.slice(0, 3).map(r => r.content).join('\n\n');
  const answerPrompt = `你是一个药品法规专家。根据以下知识库内容，回答用户问题。

用户问题：${query}

知识库内容：
${context}

请用中文回答，列出相关法规和处理方式。`;

  const answerBody = {
    model: 'qwen/qwen3.5-9b',
    messages: [{role: 'user', content: answerPrompt}],
    max_tokens: 3000,
    temperature: 0.3,
    stream: false
  };

  let answerResult = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(answerBody)
  });

  let answerData = await answerResult.json();
  const answerContent = answerData.choices[0].message.reasoning_content || answerData.choices[0].message.content;
  
  console.log('='.repeat(50));
  console.log('📋 最终答案:');
  console.log('='.repeat(50));
  console.log(answerContent);
  
}).catch(err => {
  console.error('错误:', err.message);
});