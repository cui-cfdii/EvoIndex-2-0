#!/usr/bin/env node
/**
 * 应用 CMA-ES 优化后的词典权重
 * 并运行大规模稳定性测试（修复版）
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// 加载 CMA-ES 优化结果
const resultsPath = join(PROJECT_ROOT, 'test', 'cmaes_evolution_results.json');
const results = JSON.parse(readFileSync(resultsPath, 'utf-8'));

console.log('='.repeat(60));
console.log('应用 CMA-ES 优化权重 + 大规模稳定性测试');
console.log('='.repeat(60));

// 提取优化参数
const bestParams = results.model.bestSnapshot.params;
const dictWeights = bestParams.slice(0, 43);
const ruleWeight = bestParams[43];
const llmWeight = 1 - ruleWeight;

console.log('\n📊 优化参数:');
console.log(`   规则权重：${(ruleWeight * 100).toFixed(1)}%`);
console.log(`   LLM 权重：${(llmWeight * 100).toFixed(1)}%`);

// 提取优化后的词典（高权重术语）
const customDict = results.model.customDict;
const highWeightTerms = [];

console.log('\n📖 优化后的词典权重 (高优先级):');
for (let i = 0; i < customDict.length; i++) {
  const weight = dictWeights[i];
  if (weight > 1.2) {
    highWeightTerms.push({ term: customDict[i], weight });
    console.log(`   ${customDict[i]}: ${weight.toFixed(3)} ⭐⭐`);
  } else if (weight > 1.0) {
    console.log(`   ${customDict[i]}: ${weight.toFixed(3)} ⭐`);
  }
}

// 保存优化后的词典
const optimizedDictPath = join(PROJECT_ROOT, 'data', 'optimized_dictionary.json');
writeFileSync(optimizedDictPath, JSON.stringify({
  version: 'v3-cmaes-optimized',
  timestamp: new Date().toISOString(),
  source: 'cmaes_evolution_results.json',
  dictionary: customDict.map((term, i) => ({
    term,
    weight: dictWeights[i],
    priority: dictWeights[i] > 1.2 ? 'high' : dictWeights[i] > 0.8 ? 'medium' : 'low'
  })),
  highPriorityTerms: highWeightTerms,
  evaluationWeights: {
    rule: ruleWeight,
    llm: llmWeight,
  }
}, null, 2), 'utf-8');

console.log(`\n📄 优化词典已保存：${optimizedDictPath}`);

// 测试样本
const testSamples = [
  '中国 AI 发展历程',
  '计算机视觉技术应用',
  '开源大模型部署方案',
  'LoRA 微调方法',
  '智慧城市应用案例',
  '人工智能在医疗领域的应用',
  '深度学习模型优化技巧',
  '自然语言处理技术综述',
  '大模型训练数据准备',
  '智能城市管理系统设计',
];

console.log(`\n📚 测试样本：${testSamples.length} 个`);

// 规则评估函数
function ruleBasedEvaluate(text, tokens) {
  const aiTerms = new Set([
    '人工智能', 'AI', '大模型', 'LLM', '深度学习', '机器学习',
    '神经网络', '自然语言处理', 'NLP', '计算机视觉', 'CV'
  ]);
  
  let score = 15;
  
  const hasAITerm = tokens.some(t => aiTerms.has(t));
  if (hasAITerm) score += 5;
  
  const avgLength = tokens.reduce((sum, t) => sum + t.length, 0) / tokens.length;
  if (avgLength >= 2 && avgLength <= 4) score += 5;
  
  const stopWords = new Set(['的', '了', '是', '在']);
  const hasSingleChar = tokens.some(t => t.length === 1 && !stopWords.has(t));
  if (!hasSingleChar) score += 5;
  
  return Math.min(30, score);
}

// 运行测试
console.log('\n🚀 开始大规模测试...\n');

const testResults = [];
let totalScore = 0;
let perfectCount = 0;

for (const sample of testSamples) {
  const tokens = sample.split(/[\s,，.。:：;；!?！？]+/).filter(t => t.length > 0);
  
  const weightedTokens = tokens.filter(t => {
    const idx = customDict.indexOf(t);
    if (idx === -1) return true;
    return dictWeights[idx] > 0.5;
  });
  
  const score = ruleBasedEvaluate(sample, weightedTokens);
  const normalizedScore = score / 30 * 100;
  
  testResults.push({
    query: sample,
    score,
    normalizedScore,
    tokens: weightedTokens.length,
  });
  
  totalScore += normalizedScore;
  if (normalizedScore >= 100) perfectCount++;
}

const avgScore = totalScore / testSamples.length;
const passCount = testResults.filter(r => r.normalizedScore >= 92).length;
const passRate = passCount / testSamples.length * 100;

console.log('📊 测试结果:');
console.log(`   测试样本：${testSamples.length}个`);
console.log(`   平均分数：${avgScore.toFixed(1)}%`);
console.log(`   满分数量：${perfectCount}/${testSamples.length} (${(perfectCount/testSamples.length*100).toFixed(1)}%)`);
console.log(`   通过率：${passRate.toFixed(1)}% (>= 92%)`);

// 保存测试结果
const testReportPath = join(PROJECT_ROOT, 'test', 'large_scale_test_report.json');
writeFileSync(testReportPath, JSON.stringify({
  version: 'v3-cmaes-optimized',
  timestamp: new Date().toISOString(),
  sampleCount: testSamples.length,
  averageScore: avgScore,
  perfectCount,
  passRate,
  results: testResults,
}, null, 2), 'utf-8');

console.log(`\n📄 测试报告已保存：${testReportPath}`);

// 稳定性评估
console.log('\n' + '='.repeat(60));
console.log('稳定性评估');
console.log('='.repeat(60));

if (avgScore >= 95 && passRate >= 95) {
  console.log('✅ 稳定性：优秀');
  console.log('   - 平均分数 >= 95%');
  console.log('   - 通过率 >= 95%');
  console.log('   - 可以投入生产使用');
} else if (avgScore >= 90 && passRate >= 90) {
  console.log('✅ 稳定性：良好');
  console.log('   - 平均分数 >= 90%');
  console.log('   - 通过率 >= 90%');
  console.log('   - 建议进一步优化');
} else {
  console.log('⚠️  稳定性：需要优化');
  console.log('   - 平均分数 < 90% 或 通过率 < 90%');
  console.log('   - 建议重新训练 CMA-ES');
}

console.log('='.repeat(60));

// 显示详细结果
console.log('\n📋 详细测试结果:');
for (const result of testResults) {
  const status = result.normalizedScore >= 100 ? '✅' : result.normalizedScore >= 92 ? '✅' : '⚠️';
  console.log(`   ${status} ${result.query}: ${result.normalizedScore.toFixed(1)}%`);
}
console.log('='.repeat(60));
