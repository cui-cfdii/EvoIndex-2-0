#!/usr/bin/env node
/**
 * CMA-ES 重新训练 - 使用 14 个文档
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
console.log('CMA-ES 重新训练 - 使用 14 个文档');
console.log('='.repeat(60));

// 加载现有词典
const dictPath = join(PROJECT_ROOT, 'data', 'optimized_dictionary.json');
const dictData = JSON.parse(readFileSync(dictPath, 'utf-8'));
const customDict = dictData.dictionary.map(d => d.term);

console.log(`\n📖 现有词典：${customDict.length} 个术语`);

// 加载所有文档
function loadAllDocuments() {
  const docsDir = join(PROJECT_ROOT, 'data');
  const documents = [];
  
  const testFiles = [
    'test_documents/chinese_ai_report.md',
    'test_documents/open_source_llm_guide.md',
    'test_documents/test_document.md',
    'test_documents/medical_ai_guide.md',
    'test_documents/legal_tech_practice.md',
    'test_documents/fintech_risk_management.md',
    'articles/medical_ai/01_肺结节检测.md',
    'articles/medical_ai/02_眼底疾病筛查.md',
    'articles/llm/01_大模型部署最佳实践.md',
    'articles/llm/02_LoRA 微调实战.md',
    'articles/llm/03_大模型推理优化实战.md',
    'articles/ai_tech/01_YOLOv8 目标检测实战.md',
    'articles/ai_tech/02_自然语言处理技术.md',
    'articles/legal_fintech/01_AI 法律科技实战.md',
  ];
  
  for (const file of testFiles) {
    try {
      const content = readFileSync(join(docsDir, file), 'utf-8');
      documents.push({
        filename: file.split('/').pop(),
        filepath: file,
        content,
        contentLower: content.toLowerCase()
      });
    } catch (error) {
      console.warn(`⚠️  无法加载文档：${file}`);
    }
  }
  
  return documents;
}

// jieba 分词
function tokenizeWithJieba(text) {
  try {
    const result = execSync(`python "${JIEBA_SCRIPT}" tokenize "${text}"`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const parsed = JSON.parse(result);
    if (parsed.success) {
      return parsed.tokens;
    }
  } catch (error) {
    // 静默失败
  }
  return text.split(/[\s,，.。:：;；!?！？]+/).filter(t => t.length > 0);
}

// 提取文档中的所有术语
function extractAllTerms(documents) {
  const termFreq = new Map();
  
  for (const doc of documents) {
    const tokens = tokenizeWithJieba(doc.content);
    for (const token of tokens) {
      if (token.length >= 2) { // 至少 2 个字
        termFreq.set(token, (termFreq.get(token) || 0) + 1);
      }
    }
  }
  
  // 按频率排序
  const sorted = Array.from(termFreq.entries())
    .sort((a, b) => b[1] - a[1]);
  
  console.log(`\n📊 提取术语：${sorted.length} 个`);
  console.log(`   高频术语 (>=5 次): ${sorted.filter(([_, f]) => f >= 5).length} 个`);
  console.log(`   中频术语 (2-4 次): ${sorted.filter(([_, f]) => f >= 2 && f < 5).length} 个`);
  
  return sorted;
}

// 评估函数
function evaluateParams(params, documents, allTerms) {
  // params: 每个术语的权重
  const termWeights = new Map();
  for (let i = 0; i < allTerms.length && i < params.length; i++) {
    termWeights.set(allTerms[i][0], params[i]);
  }
  
  // 评估：文档内术语覆盖率
  let totalScore = 0;
  
  for (const doc of documents) {
    const tokens = tokenizeWithJieba(doc.content);
    const weightedTokens = tokens.filter(t => {
      const weight = termWeights.get(t) || 0.5;
      return weight > 0.3; // 降低阈值到 0.3
    });
    
    // 覆盖率 = 加权术语数 / 总术语数
    const coverage = weightedTokens.length / tokens.length;
    totalScore += coverage;
  }
  
  return (totalScore / documents.length) * 30; // 归一化到 0-30
}

// 简化的 CMA-ES 实现
class SimpleCMAES {
  constructor(dim, populationSize = 20) {
    this.dim = dim;
    this.lambda = populationSize;
    this.mu = Math.floor(populationSize / 2);
    this.weights = new Array(this.mu).fill(1).map((_, i) => 
      Math.log(this.mu + 1) - Math.log(i + 1)
    );
    const sumWeights = this.weights.reduce((a, b) => a + b, 0);
    this.weights = this.weights.map(w => w / sumWeights);
    
    this.mean = new Array(dim).fill(1.0);
    this.sigma = 0.5;
    this.bestScore = -Infinity;
    this.bestParams = [...this.mean];
  }
  
  sample() {
    return this.mean.map(m => {
      const z = this._gaussian();
      return Math.max(0.1, m + this.sigma * z); // 确保权重不为负
    });
  }
  
  _gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
  
  step(evaluateFn) {
    const population = [];
    const scores = [];
    
    for (let i = 0; i < this.lambda; i++) {
      const params = this.sample();
      try {
        const score = evaluateFn(params);
        population.push(params);
        scores.push({ score, index: i });
        
        if (score > this.bestScore) {
          this.bestScore = score;
          this.bestParams = [...params];
        }
      } catch (error) {
        console.error(`评估失败：${error.message}`);
        scores.push({ score: -Infinity, index: i });
        population.push(params);
      }
    }
    
    scores.sort((a, b) => b.score - a.score);
    const selectedIndices = scores.slice(0, this.mu).map(s => s.index);
    
    // 更新均值
    const newMean = new Array(this.dim).fill(0);
    for (let i = 0; i < this.mu; i++) {
      const idx = selectedIndices[i];
      for (let j = 0; j < this.dim; j++) {
        newMean[j] += this.weights[i] * population[idx][j];
      }
    }
    this.mean = newMean;
    
    return {
      bestScore: this.bestScore,
      meanScore: scores.reduce((a, b) => a + b.score, 0) / this.lambda
    };
  }
}

// 运行训练
console.log('\n🚀 开始重新训练...\n');

const documents = loadAllDocuments();
console.log(`📄 加载文档：${documents.length} 个`);

const allTerms = extractAllTerms(documents);
const topTerms = allTerms.slice(0, 100); // 取前 100 个高频术语

console.log(`\n🎯 优化术语：${topTerms.length} 个`);

// 创建 CMA-ES 优化器
const optimizer = new SimpleCMAES(topTerms.length, 20);

console.log('\n📊 开始进化...\n');

const generations = 50;
const history = [];

for (let gen = 0; gen < generations; gen++) {
  const result = optimizer.step((params) => evaluateParams(params, documents, topTerms));
  history.push(result);
  
  if (gen % 10 === 0) {
    console.log(`第 ${gen}代：最佳=${(result.bestScore / 30 * 100).toFixed(1)}%, 平均=${(result.meanScore / 30 * 100).toFixed(1)}%`);
  }
}

console.log(`\n📊 最终结果:`);
console.log(`   最佳分数：${(optimizer.bestScore / 30 * 100).toFixed(1)}%`);
console.log(`   收敛代数：${history.findIndex(h => h.bestScore / 30 >= 0.95) + 1 || generations}代`);

// 生成新词典
const newDict = topTerms.map((term, i) => ({
  term: term[0],
  weight: optimizer.bestParams[i],
  frequency: term[1]
}));

// 保存新词典
const newDictPath = join(PROJECT_ROOT, 'data', 'optimized_dictionary_v2.json');
writeFileSync(newDictPath, JSON.stringify({
  version: 'v6-cmaes-retrained-14docs',
  timestamp: new Date().toISOString(),
  dictionary: newDict,
  trainingDocs: documents.length,
  totalTerms: allTerms.length,
  optimizedTerms: topTerms.length,
  finalScore: optimizer.bestScore,
  generations,
  history
}, null, 2), 'utf-8');

console.log(`\n📄 新词典已保存：${newDictPath}`);

// 显示高权重术语
console.log('\n📖 高权重术语 (权重>1.0):');
const highWeightTerms = newDict.filter(d => d.weight > 1.0).slice(0, 20);
for (const term of highWeightTerms) {
  console.log(`   ${term.term}: ${term.weight.toFixed(3)} (频率:${term.frequency})`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ CMA-ES 重新训练完成！');
console.log('='.repeat(60));
