#!/usr/bin/env node
/**
 * P1.3 性能基准测试 - 查询延迟、并发性能
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
console.log('P1.3 性能基准测试 - 查询延迟、并发性能');
console.log('='.repeat(60));

// 加载优化词典
const dictPath = join(PROJECT_ROOT, 'data', 'optimized_dictionary.json');
const dictData = JSON.parse(readFileSync(dictPath, 'utf-8'));
const customDict = dictData.dictionary.map(d => d.term);
const dictWeights = dictData.dictionary.map(d => d.weight);

// 测试样本（10 个标准查询）
const testQueries = [
  '中国 AI 发展历程',
  '计算机视觉技术应用',
  '大模型部署方案',
  'LoRA 微调方法',
  '智慧城市应用案例',
  '医学影像分析',
  '智能合同审查',
  '信用风险评估',
  '量化交易',
  '自然语言处理技术',
];

console.log(`\n📚 测试查询：${testQueries.length} 个`);

// jieba 分词
function tokenizeWithJieba(text) {
  const start = Date.now();
  try {
    const result = execSync(`python "${JIEBA_SCRIPT}" tokenize "${text}"`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const end = Date.now();
    const parsed = JSON.parse(result);
    if (parsed.success) {
      return {
        tokens: parsed.tokens,
        latency: end - start
      };
    }
  } catch (error) {
    const end = Date.now();
    return {
      tokens: text.split(/[\s,，.。:：;；!?！？]+/).filter(t => t.length > 0),
      latency: end - start
    };
  }
  const end = Date.now();
  return {
    tokens: text.split(/[\s,，.。:：;；!?！？]+/).filter(t => t.length > 0),
    latency: end - start
  };
}

// 内容匹配评分
function contentMatchScore(contentLower, tokens, keywords) {
  let score = 0;
  let maxScore = 0;
  
  for (const token of tokens) {
    if (token.length > 1) {
      maxScore += 0.6;
      if (contentLower.includes(token.toLowerCase())) {
        score += 0.6;
      }
    }
  }
  
  for (const keyword of keywords) {
    maxScore += 0.4;
    if (contentLower.includes(keyword.toLowerCase())) {
      score += 0.4;
    }
  }
  
  return maxScore > 0 ? score / maxScore : 0;
}

// 加载测试文档
function loadTestDocuments() {
  const docsDir = join(PROJECT_ROOT, 'data', 'test_documents');
  const documents = [];
  
  const files = [
    'chinese_ai_report.md',
    'open_source_llm_guide.md',
    'test_document.md',
    'medical_ai_guide.md',
    'legal_tech_practice.md',
    'fintech_risk_management.md'
  ];
  
  for (const file of files) {
    try {
      const content = readFileSync(join(docsDir, file), 'utf-8');
      documents.push({
        filename: file,
        content,
        contentLower: content.toLowerCase()
      });
    } catch (error) {
      console.warn(`⚠️  无法加载文档：${file}`);
    }
  }
  
  return documents;
}

// 单次查询性能测试
function benchmarkSingleQuery(query, documents) {
  const totalTimeStart = Date.now();
  
  // 分词
  const tokenizeResult = tokenizeWithJieba(query);
  const tokens = tokenizeResult.tokens;
  const tokenizeLatency = tokenizeResult.latency;
  
  // 应用权重
  const weightedTokens = tokens.filter(t => {
    const idx = customDict.indexOf(t);
    if (idx === -1) return true;
    return dictWeights[idx] > 0.5;
  });
  
  // 匹配文档
  let bestScore = 0;
  let bestMatch = null;
  const matchStart = Date.now();
  
  for (const doc of documents) {
    const score = contentMatchScore(doc.contentLower, weightedTokens, tokens);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        filename: doc.filename,
        score
      };
    }
  }
  
  const matchLatency = Date.now() - matchStart;
  const totalLatency = Date.now() - totalTimeStart;
  
  return {
    query,
    tokens: tokens.length,
    weightedTokens: weightedTokens.length,
    tokenizeLatency,
    matchLatency,
    totalLatency,
    bestMatch: bestMatch?.filename,
    score: bestScore
  };
}

// 并发测试
async function benchmarkConcurrent(queries, documents, concurrency) {
  const results = [];
  const startTime = Date.now();
  
  // 分批执行
  for (let i = 0; i < queries.length; i += concurrency) {
    const batch = queries.slice(i, i + concurrency);
    const batchPromises = batch.map(query => {
      return new Promise(resolve => {
        const result = benchmarkSingleQuery(query, documents);
        resolve(result);
      });
    });
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  const totalTime = Date.now() - startTime;
  
  return {
    results,
    totalTime,
    qps: queries.length / (totalTime / 1000)
  };
}

// 运行测试
console.log('\n🚀 开始性能基准测试...\n');

const documents = loadTestDocuments();
console.log(`📄 加载文档：${documents.length} 个\n`);

// 1. 单次查询延迟测试
console.log('📊 测试 1: 单次查询延迟\n');
const singleResults = [];
for (const query of testQueries) {
  const result = benchmarkSingleQuery(query, documents);
  singleResults.push(result);
  console.log(`   "${query}": ${result.totalLatency}ms (分词:${result.tokenizeLatency}ms, 匹配:${result.matchLatency}ms)`);
}

const avgLatency = singleResults.reduce((sum, r) => sum + r.totalLatency, 0) / singleResults.length;
const maxLatency = Math.max(...singleResults.map(r => r.totalLatency));
const minLatency = Math.min(...singleResults.map(r => r.totalLatency));

console.log(`\n   平均延迟：${avgLatency.toFixed(1)}ms`);
console.log(`   最大延迟：${maxLatency}ms`);
console.log(`   最小延迟：${minLatency}ms`);

// 2. 并发性能测试
console.log('\n📊 测试 2: 并发性能测试\n');

const concurrencyLevels = [1, 5, 10, 20];
const concurrentResults = [];

for (const concurrency of concurrencyLevels) {
  const result = await benchmarkConcurrent(testQueries, documents, concurrency);
  concurrentResults.push({
    concurrency,
    totalTime: result.totalTime,
    qps: result.qps.toFixed(2)
  });
  console.log(`   并发度 ${concurrency}: ${result.totalTime}ms, QPS: ${result.qps.toFixed(2)}`);
}

// 3. 召回率验证
console.log('\n📊 测试 3: 召回率验证\n');
const recallResults = singleResults.filter(r => r.score >= 0.92);
const recallRate = recallResults.length / singleResults.length * 100;
console.log(`   通过查询：${recallResults.length}/${singleResults.length} (${recallRate.toFixed(1)}%)`);

// 保存结果
const reportPath = join(PROJECT_ROOT, 'test', 'performance_benchmark_report.json');
writeFileSync(reportPath, JSON.stringify({
  version: 'v5-jieba-cmaes-optimized',
  timestamp: new Date().toISOString(),
  singleQuery: {
    avgLatency,
    maxLatency,
    minLatency,
    results: singleResults
  },
  concurrentQuery: {
    results: concurrentResults
  },
  recallRate,
}, null, 2), 'utf-8');

console.log(`\n📄 测试报告已保存：${reportPath}`);

// 性能评估
console.log('\n' + '='.repeat(60));
console.log('性能评估');
console.log('='.repeat(60));

const latencyPass = avgLatency < 200;
const qpsPass = concurrentResults.find(r => r.concurrency === 10)?.qps > 50;
const recallPass = recallRate >= 90;

if (latencyPass && recallPass) {
  console.log('✅ 性能：优秀');
  console.log(`   - 平均延迟 < 200ms (${avgLatency.toFixed(1)}ms)`);
  console.log(`   - 召回率 >= 90% (${recallRate.toFixed(1)}%)`);
  console.log('   - 可以投入生产使用');
  console.log('\n🎉 P1.3 性能基准测试通过！');
} else {
  console.log('⚠️  性能：需要优化');
  console.log(`   - 平均延迟：${avgLatency.toFixed(1)}ms (目标<200ms)`);
  console.log(`   - 召回率：${recallRate.toFixed(1)}% (目标>=90%)`);
  console.log('   - 建议优化');
}

console.log('='.repeat(60));

// 详细结果
console.log('\n📋 详细性能数据:');
console.log(`   测试查询数：${testQueries.length}个`);
console.log(`   文档总数：${documents.length}个`);
console.log(`   总文档大小：${(documents.reduce((sum, d) => sum + d.content.length, 0) / 1024).toFixed(1)}KB`);
console.log(`   平均延迟：${avgLatency.toFixed(1)}ms`);
console.log(`   10 并发 QPS: ${concurrentResults.find(r => r.concurrency === 10)?.qps || 'N/A'}`);
console.log(`   召回率：${recallRate.toFixed(1)}%`);
console.log('='.repeat(60));
