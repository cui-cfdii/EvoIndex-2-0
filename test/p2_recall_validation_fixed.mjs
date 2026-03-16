#!/usr/bin/env node
/**
 * P2 召回率验证测试（修复版）- 增加样本文章后
 * 修复：expectedFile 与实际文档路径匹配
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
console.log('P2 召回率验证测试（修复版）- 增加样本文章后');
console.log('='.repeat(60));

// 加载优化词典
const dictPath = join(PROJECT_ROOT, 'data', 'optimized_dictionary.json');
const dictData = JSON.parse(readFileSync(dictPath, 'utf-8'));
const customDict = dictData.dictionary.map(d => d.term);
const dictWeights = dictData.dictionary.map(d => d.weight);

console.log(`\n📖 加载优化词典：${customDict.length} 个术语`);

// 测试样本（50 个）- 修复 expectedFile 为实际文档路径
const testSamples = [
  // 医疗 AI (15 个)
  { query: '医学影像分析', expectedFile: 'medical_ai_guide.md' },
  { query: '肺结节检测', expectedFile: '01_肺结节检测.md' },
  { query: '眼底疾病筛查', expectedFile: '02_眼底疾病筛查.md' },
  { query: '药物研发 AI 辅助', expectedFile: 'medical_ai_guide.md' },
  { query: '临床决策支持', expectedFile: 'medical_ai_guide.md' },
  { query: '个性化治疗', expectedFile: 'medical_ai_guide.md' },
  { query: '3D U-Net 架构', expectedFile: '01_肺结节检测.md' },
  { query: '糖尿病视网膜病变', expectedFile: '02_眼底疾病筛查.md' },
  { query: 'CT 影像处理', expectedFile: '01_肺结节检测.md' },
  { query: 'Grad-CAM 可解释性', expectedFile: '02_眼底疾病筛查.md' },
  { query: '注意力机制', expectedFile: '01_肺结节检测.md' },
  { query: 'NMPA 审批', expectedFile: '02_眼底疾病筛查.md' },
  { query: 'DICOM 集成', expectedFile: '01_肺结节检测.md' },
  { query: '智能诊疗系统', expectedFile: 'medical_ai_guide.md' },
  { query: '基因组学应用', expectedFile: 'medical_ai_guide.md' },
  
  // 大模型 (15 个)
  { query: '大模型部署方案', expectedFile: 'open_source_llm_guide.md' },
  { query: 'LoRA 微调方法', expectedFile: '02_LoRA 微调实战.md' },
  { query: '模型量化技术', expectedFile: '03_大模型推理优化实战.md' },
  { query: '推理加速方案', expectedFile: '03_大模型推理优化实战.md' },
  { query: 'LM Studio 使用', expectedFile: '01_大模型部署最佳实践.md' },
  { query: 'Ollama 部署', expectedFile: '01_大模型部署最佳实践.md' },
  { query: 'vLLM 性能优化', expectedFile: '03_大模型推理优化实战.md' },
  { query: 'ModelScope 模型', expectedFile: 'open_source_llm_guide.md' },
  { query: '大模型训练数据', expectedFile: 'open_source_llm_guide.md' },
  { query: '开源大模型对比', expectedFile: '01_大模型部署最佳实践.md' },
  { query: 'PagedAttention', expectedFile: '01_大模型部署最佳实践.md' },
  { query: 'Continuous Batching', expectedFile: '01_大模型部署最佳实践.md' },
  { query: 'AWQ 量化', expectedFile: '03_大模型推理优化实战.md' },
  { query: 'GGUF 格式', expectedFile: '01_大模型部署最佳实践.md' },
  { query: 'QLoRA 微调', expectedFile: '02_LoRA 微调实战.md' },
  
  // AI 技术 (10 个)
  { query: '计算机视觉应用', expectedFile: '01_YOLOv8 目标检测实战.md' },
  { query: '自然语言处理技术', expectedFile: '02_自然语言处理技术.md' },
  { query: 'YOLOv8 目标检测', expectedFile: '01_YOLOv8 目标检测实战.md' },
  { query: 'Transformer 架构', expectedFile: '02_自然语言处理技术.md' },
  { query: 'BERT 模型', expectedFile: '02_自然语言处理技术.md' },
  { query: '机器学习算法', expectedFile: 'chinese_ai_report.md' },
  { query: '智慧城市应用', expectedFile: 'chinese_ai_report.md' },
  { query: '知识图谱构建', expectedFile: 'chinese_ai_report.md' },
  { query: '数据挖掘技术', expectedFile: 'chinese_ai_report.md' },
  { query: '智能推荐系统', expectedFile: 'chinese_ai_report.md' },
  
  // 法律科技 (5 个)
  { query: '智能合同审查', expectedFile: '01_AI 法律科技实战.md' },
  { query: '合同风险识别', expectedFile: '01_AI 法律科技实战.md' },
  { query: '法律检索系统', expectedFile: 'legal_tech_practice.md' },
  { query: '诉讼预测', expectedFile: 'legal_tech_practice.md' },
  { query: '合规管理', expectedFile: '01_AI 法律科技实战.md' },
  
  // 金融科技 (5 个)
  { query: '信用风险评估', expectedFile: 'fintech_risk_management.md' },
  { query: '个人信用评分', expectedFile: 'fintech_risk_management.md' },
  { query: '反欺诈系统', expectedFile: 'fintech_risk_management.md' },
  { query: '量化交易', expectedFile: 'fintech_risk_management.md' },
  { query: '智能投顾', expectedFile: 'fintech_risk_management.md' },
];

console.log(`📚 测试样本：${testSamples.length} 个（5 个领域）`);

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
  const docsDir = join(PROJECT_ROOT, 'data');
  const documents = [];
  
  // 测试文档
  const testFiles = [
    'test_documents/chinese_ai_report.md',
    'test_documents/open_source_llm_guide.md',
    'test_documents/test_document.md',
    'test_documents/medical_ai_guide.md',
    'test_documents/legal_tech_practice.md',
    'test_documents/fintech_risk_management.md',
    // 新增样本文章
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
console.log('\n🚀 开始召回率验证测试（修复版）...\n');

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
        filepath: doc.filepath,
        score
      };
    }
  }
  
  // 计算召回率 - 修复：检查文件名是否匹配
  const fileMatched = bestMatch?.filename === sample.expectedFile;
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
console.log(`   测试样本：${testSamples.length}个（5 个领域）`);
console.log(`   平均召回率：${(avgRecall * 100).toFixed(1)}%`);
console.log(`   满分数量：${perfectCount}/${testSamples.length} (${perfectRate.toFixed(1)}%)`);
console.log(`   通过率：${passCount}/${testSamples.length} (${passRate.toFixed(1)}%) (>= 92%)`);

// 分类统计
const categories = {
  '医疗 AI': testSamples.slice(0, 15),
  '大模型': testSamples.slice(15, 30),
  'AI 技术': testSamples.slice(30, 40),
  '法律科技': testSamples.slice(40, 45),
  '金融科技': testSamples.slice(45, 50),
};

console.log('\n📋 分类统计:');
let catStart = 0;
for (const [catName, catSamples] of Object.entries(categories)) {
  const catResults = results.slice(catStart, catStart + catSamples.length);
  const catAvg = catResults.reduce((sum, r) => sum + r.recall, 0) / catSamples.length;
  const catPass = catResults.filter(r => r.recall >= 0.92).length;
  
  console.log(`   ${catName}: ${(catAvg * 100).toFixed(1)}% (通过${catPass}/${catSamples.length})`);
  catStart += catSamples.length;
}

// 与之前对比
console.log('\n📈 与之前对比:');
console.log('   P0 标准 5 样本：100.0% → ' + (avgRecall * 100).toFixed(1) + '%');
console.log('   P1.2 多领域 40 样本：91.7% → ' + (avgRecall * 100).toFixed(1) + '%');
console.log('   P2 修复版提升：+' + ((avgRecall - 0.49) * 100).toFixed(1) + '%');

// 保存结果
const reportPath = join(PROJECT_ROOT, 'test', 'p2_recall_validation_fixed_report.json');
writeFileSync(reportPath, JSON.stringify({
  version: 'v5-jieba-cmaes-optimized-with-articles-fixed',
  timestamp: new Date().toISOString(),
  sampleCount: testSamples.length,
  averageRecall: avgRecall,
  perfectCount,
  passCount,
  perfectRate,
  passRate,
  categories: {
    '医疗 AI': results.slice(0, 15).reduce((sum, r) => sum + r.recall, 0) / 15,
    '大模型': results.slice(15, 30).reduce((sum, r) => sum + r.recall, 0) / 15,
    'AI 技术': results.slice(30, 40).reduce((sum, r) => sum + r.recall, 0) / 10,
    '法律科技': results.slice(40, 45).reduce((sum, r) => sum + r.recall, 0) / 5,
    '金融科技': results.slice(45, 50).reduce((sum, r) => sum + r.recall, 0) / 5,
  },
  results,
}, null, 2), 'utf-8');

console.log(`\n📄 测试报告已保存：${reportPath}`);

// 稳定性评估
console.log('\n' + '='.repeat(60));
console.log('稳定性评估');
console.log('='.repeat(60));

if (avgRecall >= 0.95 && passRate >= 95) {
  console.log('✅ 多领域泛化能力：优秀');
  console.log('   - 平均召回率 >= 95%');
  console.log('   - 通过率 >= 95%');
  console.log('   - 自进化分词在多领域表现稳定');
  console.log('\n🎉 P2 召回率验证通过！');
} else if (avgRecall >= 0.90 && passRate >= 90) {
  console.log('✅ 多领域泛化能力：良好');
  console.log('   - 平均召回率 >= 90%');
  console.log('   - 通过率 >= 90%');
  console.log('   - 建议继续优化');
} else {
  console.log('⚠️  多领域泛化能力：需要优化');
  console.log('   - 平均召回率 < 90% 或 通过率 < 90%');
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
