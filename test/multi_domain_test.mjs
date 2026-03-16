#!/usr/bin/env node
/**
 * P1.2 多领域适应测试 - 医疗、法律、金融 + 大模型
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
console.log('P1.2 多领域适应测试 - 医疗、法律、金融、大模型');
console.log('='.repeat(60));

// 加载优化词典
const dictPath = join(PROJECT_ROOT, 'data', 'optimized_dictionary.json');
const dictData = JSON.parse(readFileSync(dictPath, 'utf-8'));
const customDict = dictData.dictionary.map(d => d.term);
const dictWeights = dictData.dictionary.map(d => d.weight);

console.log(`\n📖 加载优化词典：${customDict} 个术语`);

// 多领域测试样本（40 个）
const testSamples = [
  // 医疗 AI (10 个)
  { query: '医学影像分析', expectedFile: 'medical_ai_guide.md' },
  { query: '肺结节检测', expectedFile: 'medical_ai_guide.md' },
  { query: '病理切片分析', expectedFile: 'medical_ai_guide.md' },
  { query: '眼底疾病筛查', expectedFile: 'medical_ai_guide.md' },
  { query: '药物研发 AI 辅助', expectedFile: 'medical_ai_guide.md' },
  { query: '蛋白质结构预测', expectedFile: 'medical_ai_guide.md' },
  { query: '临床决策支持', expectedFile: 'medical_ai_guide.md' },
  { query: '个性化治疗', expectedFile: 'medical_ai_guide.md' },
  { query: '基因组学应用', expectedFile: 'medical_ai_guide.md' },
  { query: '智能诊疗系统', expectedFile: 'medical_ai_guide.md' },
  
  // 法律科技 (10 个)
  { query: '智能合同审查', expectedFile: 'legal_tech_practice.md' },
  { query: '合同风险识别', expectedFile: 'legal_tech_practice.md' },
  { query: '法律检索系统', expectedFile: 'legal_tech_practice.md' },
  { query: '案例检索', expectedFile: 'legal_tech_practice.md' },
  { query: '诉讼预测', expectedFile: 'legal_tech_practice.md' },
  { query: '判决结果预测', expectedFile: 'legal_tech_practice.md' },
  { query: '合规管理', expectedFile: 'legal_tech_practice.md' },
  { query: 'GDPR 合规', expectedFile: 'legal_tech_practice.md' },
  { query: '反垄断合规', expectedFile: 'legal_tech_practice.md' },
  { query: '法律科技应用', expectedFile: 'legal_tech_practice.md' },
  
  // 金融科技 (10 个)
  { query: '信用风险评估', expectedFile: 'fintech_risk_management.md' },
  { query: '个人信用评分', expectedFile: 'fintech_risk_management.md' },
  { query: '企业信用评估', expectedFile: 'fintech_risk_management.md' },
  { query: '反欺诈系统', expectedFile: 'fintech_risk_management.md' },
  { query: '交易欺诈检测', expectedFile: 'fintech_risk_management.md' },
  { query: '量化交易', expectedFile: 'fintech_risk_management.md' },
  { query: '因子挖掘', expectedFile: 'fintech_risk_management.md' },
  { query: '投资组合优化', expectedFile: 'fintech_risk_management.md' },
  { query: '智能投顾', expectedFile: 'fintech_risk_management.md' },
  { query: '客户画像', expectedFile: 'fintech_risk_management.md' },
  
  // 大模型 (10 个)
  { query: '大模型部署方案', expectedFile: 'open_source_llm_guide.md' },
  { query: 'LoRA 微调方法', expectedFile: 'open_source_llm_guide.md' },
  { query: '模型量化技术', expectedFile: 'open_source_llm_guide.md' },
  { query: '推理加速方案', expectedFile: 'open_source_llm_guide.md' },
  { query: 'LM Studio 使用', expectedFile: 'open_source_llm_guide.md' },
  { query: 'Ollama 部署', expectedFile: 'open_source_llm_guide.md' },
  { query: 'vLLM 性能优化', expectedFile: 'open_source_llm_guide.md' },
  { query: 'ModelScope 模型', expectedFile: 'open_source_llm_guide.md' },
  { query: '大模型训练数据', expectedFile: 'open_source_llm_guide.md' },
  { query: '开源大模型对比', expectedFile: 'open_source_llm_guide.md' },
];

console.log(`📚 测试样本：${testSamples.length} 个（4 个领域）`);

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

// 运行测试
console.log('\n🚀 开始多领域测试...\n');

const documents = loadTestDocuments();
console.log(`📄 加载文档：${documents.length} 个\n`);

const results = [];
let totalRecall = 0;
let perfectCount = 0;
let passCount = 0;

for (const sample of testSamples) {
  // jieba 分词
  const tokens = tokenizeWithJieba(sample.query);
  
  // 应用优化权重
  const weightedTokens = tokens.filter(t => {
    const idx = customDict.indexOf(t);
    if (idx === -1) return true;
    return dictWeights[idx] > 0.5;
  });
  
  // 查找最佳匹配
  let bestScore = 0;
  let bestMatch = null;
  
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
  
  // 计算召回率
  const fileMatched = sample.expectedFile === bestMatch?.filename;
  const recall = fileMatched ? bestScore : 0;
  
  results.push({
    query: sample.query,
    expectedFile: sample.expectedFile,
    matchedFile: bestMatch?.filename || '无',
    recall,
    fileMatched,
    tokens: weightedTokens.length,
  });
  
  totalRecall += recall;
  if (recall >= 1.0) perfectCount++;
  if (recall >= 0.92) passCount++;
}

// 统计结果
const avgRecall = totalRecall / testSamples.length;
const perfectRate = perfectCount / testSamples.length * 100;
const passRate = passCount / testSamples.length * 100;

console.log('📊 测试结果:');
console.log(`   测试样本：${testSamples.length}个（4 个领域）`);
console.log(`   平均召回率：${(avgRecall * 100).toFixed(1)}%`);
console.log(`   满分数量：${perfectCount}/${testSamples.length} (${perfectRate.toFixed(1)}%)`);
console.log(`   通过率：${passCount}/${testSamples.length} (${passRate.toFixed(1)}%) (>= 92%)`);

// 分类统计
const categories = {
  '医疗 AI': testSamples.slice(0, 10),
  '法律科技': testSamples.slice(10, 20),
  '金融科技': testSamples.slice(20, 30),
  '大模型': testSamples.slice(30, 40),
};

console.log('\n📋 分类统计:');
let catStart = 0;
for (const [catName, catSamples] of Object.entries(categories)) {
  const catResults = results.slice(catStart, catStart + 10);
  const catAvg = catResults.reduce((sum, r) => sum + r.recall, 0) / 10;
  const catPass = catResults.filter(r => r.recall >= 0.92).length;
  
  console.log(`   ${catName}: ${(catAvg * 100).toFixed(1)}% (通过${catPass}/10)`);
  catStart += 10;
}

// 保存结果
const reportPath = join(PROJECT_ROOT, 'test', 'multi_domain_test_report.json');
writeFileSync(reportPath, JSON.stringify({
  version: 'v5-jieba-cmaes-optimized',
  timestamp: new Date().toISOString(),
  sampleCount: testSamples.length,
  averageRecall: avgRecall,
  perfectCount,
  passCount,
  perfectRate,
  passRate,
  categories: {
    '医疗 AI': results.slice(0, 10).reduce((sum, r) => sum + r.recall, 0) / 10,
    '法律科技': results.slice(10, 20).reduce((sum, r) => sum + r.recall, 0) / 10,
    '金融科技': results.slice(20, 30).reduce((sum, r) => sum + r.recall, 0) / 10,
    '大模型': results.slice(30, 40).reduce((sum, r) => sum + r.recall, 0) / 10,
  },
  results,
}, null, 2), 'utf-8');

console.log(`\n📄 测试报告已保存：${reportPath}`);

// 稳定性评估
console.log('\n' + '='.repeat(60));
console.log('稳定性评估');
console.log('='.repeat(60));

if (avgRecall >= 0.90 && passRate >= 90) {
  console.log('✅ 多领域泛化能力：优秀');
  console.log('   - 平均召回率 >= 90%');
  console.log('   - 通过率 >= 90%');
  console.log('   - 自进化分词在多领域表现稳定');
  console.log('\n🎉 P1.2 多领域测试通过！');
} else if (avgRecall >= 0.80 && passRate >= 80) {
  console.log('✅ 多领域泛化能力：良好');
  console.log('   - 平均召回率 >= 80%');
  console.log('   - 通过率 >= 80%');
  console.log('   - 建议继续优化');
} else {
  console.log('⚠️  多领域泛化能力：需要优化');
  console.log('   - 平均召回率 < 80% 或 通过率 < 80%');
  console.log('   - 建议重新训练 CMA-ES 或增加领域文档');
}

console.log('='.repeat(60));

// 显示未通过案例
const failedCases = results.filter(r => r.recall < 0.92);
if (failedCases.length > 0) {
  console.log(`\n⚠️  未通过案例 (${failedCases.length}个):`);
  for (const r of failedCases.slice(0, 10)) {
    console.log(`   - ${r.query}: ${(r.recall * 100).toFixed(1)}%`);
  }
  if (failedCases.length > 10) {
    console.log(`   ... 还有${failedCases.length - 10}个`);
  }
}

console.log('='.repeat(60));
