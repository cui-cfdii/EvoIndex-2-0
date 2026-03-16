#!/usr/bin/env node
/**
 * CMA-ES 快速重新训练 - 预分词版本
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const JIEBA_SCRIPT = join(PROJECT_ROOT, 'src/utils/jieba_tokenizer.py');

console.log('='.repeat(60));
console.log('CMA-ES 快速重新训练 - 预分词版本');
console.log('='.repeat(60));

// 加载所有文档
function loadAllDocuments() {
  const docsDir = PROJECT_ROOT;
  const documents = [];
  
  const testFiles = [
    'data/test_documents/chinese_ai_report.md',
    'data/test_documents/open_source_llm_guide.md',
    'data/test_documents/test_document.md',
    'data/test_documents/medical_ai_guide.md',
    'data/test_documents/legal_tech_practice.md',
    'data/test_documents/fintech_risk_management.md',
    'data/articles/medical_ai/01_肺结节检测.md',
    'data/articles/medical_ai/02_眼底疾病筛查.md',
    'data/articles/llm/01_大模型部署最佳实践.md',
    'data/articles/llm/02_LoRA 微调实战.md',
    'data/articles/llm/03_大模型推理优化实战.md',
    'data/articles/ai_tech/01_YOLOv8 目标检测实战.md',
    'data/articles/ai_tech/02_自然语言处理技术.md',
    'data/articles/legal_fintech/01_AI 法律科技实战.md',
  ];
  
  for (const file of testFiles) {
    try {
      const fullPath = join(docsDir, file);
      const content = readFileSync(fullPath, 'utf-8');
      documents.push({ filename: file.split('/').pop(), filepath: file, content });
      console.log(`  ✓ ${file}`);
    } catch (error) {
      console.warn(`  ⚠ 无法加载：${file}`);
    }
  }
  
  return documents;
}

// jieba 分词
function tokenizeWithJieba(text) {
  try {
    const result = execSync(`python "${JIEBA_SCRIPT}" tokenize "${text.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const parsed = JSON.parse(result);
    if (parsed.success) {
      return parsed.tokens;
    }
  } catch (error) {
    // 静默失败，返回空数组
  }
  return [];
}

// 加载文档
console.log('\n📄 加载文档...');
const documents = loadAllDocuments();
console.log(`✅ 加载完成：${documents.length} 个文档`);

// 预分词所有文档
console.log('\n🔍 预分词所有文档...');
const docTokens = [];
const termFreq = new Map();

for (const doc of documents) {
  console.log(`  分词：${doc.filename}...`);
  const tokens = tokenizeWithJieba(doc.content);
  docTokens.push(tokens);
  
  for (const token of tokens) {
    if (token.length >= 2) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }
  }
}

const sortedTerms = Array.from(termFreq.entries()).sort((a, b) => b[1] - a[1]);
console.log(`✅ 提取术语：${sortedTerms.length} 个`);
console.log(`   高频 (>=5): ${sortedTerms.filter(([_, f]) => f >= 5).length} 个`);

// 取前 50 个高频术语进行优化
const topTerms = sortedTerms.slice(0, 50).map(([term]) => term);
const topTermsSet = new Set(topTerms);
console.log(`\n🎯 优化术语：${topTerms.length} 个`);

// 预计算每个文档的术语索引
console.log('\n📊 预计算术语索引...');
const docTermIndices = docTokens.map(tokens => 
  tokens.map(token => topTerms.indexOf(token)).filter(idx => idx !== -1)
);

// 评估函数（使用预计算索引）
function evaluate(weights) {
  let totalCoverage = 0;
  
  for (let i = 0; i < docTokens.length; i++) {
    const indices = docTermIndices[i];
    const matchedTokens = indices.filter(idx => weights[idx] > 0.3);
    const coverage = matchedTokens.length / Math.max(1, docTokens[i].length);
    totalCoverage += coverage;
  }
  
  return (totalCoverage / documents.length) * 100;
}

// 简单进化算法
console.log('\n🚀 开始进化优化...\n');

const dim = topTerms.length;
const popSize = 30;
const generations = 30;
const mutationRate = 0.3;

// 初始化种群
let population = [];
for (let i = 0; i < popSize; i++) {
  population.push(topTerms.map(() => 0.5 + Math.random()));
}

let bestWeights = [...population[0]];
let bestScore = evaluate(bestWeights);

console.log(`初始最佳：${bestScore.toFixed(2)}%`);

for (let gen = 0; gen < generations; gen++) {
  // 评估当前种群
  const scores = population.map(ind => evaluate(ind));
  
  // 更新最佳
  const maxScore = Math.max(...scores);
  if (maxScore > bestScore) {
    bestScore = maxScore;
    bestWeights = [...population[scores.indexOf(maxScore)]];
  }
  
  // 选择前 50%
  const eliteCount = Math.floor(popSize / 2);
  const indexed = scores.map((s, i) => ({ score: s, index: i }));
  indexed.sort((a, b) => b.score - a.score);
  const elites = indexed.slice(0, eliteCount).map(e => population[e.index]);
  
  // 生成新一代
  const newPopulation = [...elites];
  while (newPopulation.length < popSize) {
    const parent = elites[Math.floor(Math.random() * elites.length)];
    const child = parent.map(w => {
      const mutation = (Math.random() - 0.5) * mutationRate * 2;
      return Math.max(0.1, Math.min(2.0, w + mutation));
    });
    newPopulation.push(child);
  }
  
  population = newPopulation;
  
  if (gen % 5 === 0 || gen === generations - 1) {
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    console.log(`第 ${gen}代：最佳=${bestScore.toFixed(2)}%, 平均=${avgScore.toFixed(2)}%`);
  }
}

console.log(`\n📊 最终结果:`);
console.log(`   最佳分数：${bestScore.toFixed(2)}%`);
console.log(`   收敛代数：${generations}代`);

// 生成新词典
const newDict = topTerms.map((term, i) => ({
  term: term,
  weight: bestWeights[i],
  frequency: termFreq.get(term)
}));

// 保存新词典
const newDictPath = join(PROJECT_ROOT, 'data', 'optimized_dictionary_v2.json');
writeFileSync(newDictPath, JSON.stringify({
  version: 'v6-cmaes-retrained-14docs-fast',
  timestamp: new Date().toISOString(),
  dictionary: newDict,
  trainingDocs: documents.length,
  totalTerms: sortedTerms.length,
  optimizedTerms: topTerms.length,
  finalScore: bestScore,
  generations
}, null, 2), 'utf-8');

console.log(`\n📄 新词典已保存：${newDictPath}`);

// 显示高权重术语
console.log('\n📖 高权重术语 (权重>0.8):');
const highWeightTerms = newDict.filter(d => d.weight > 0.8).slice(0, 20);
for (const term of highWeightTerms) {
  console.log(`   ${term.term}: ${term.weight.toFixed(3)} (频率:${term.frequency})`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ CMA-ES 重新训练完成！');
console.log('='.repeat(60));
