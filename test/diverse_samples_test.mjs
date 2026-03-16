#!/usr/bin/env node
/**
 * P1.1 多样本测试 - 50-100 个查询验证泛化能力
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
console.log('P1.1 多样本测试 - 50 个查询验证泛化能力');
console.log('='.repeat(60));

// 加载优化词典
const dictPath = join(PROJECT_ROOT, 'data', 'optimized_dictionary.json');
const dictData = JSON.parse(readFileSync(dictPath, 'utf-8'));
const customDict = dictData.dictionary.map(d => d.term);
const dictWeights = dictData.dictionary.map(d => d.weight);

console.log(`\n📖 加载优化词典：${customDict.length} 个术语`);

// 50 个测试样本（覆盖多个领域）
const testSamples = [
  // AI 技术 (10 个)
  { query: '中国 AI 发展历程', expectedFile: 'chinese_ai_report.md' },
  { query: '计算机视觉技术应用', expectedFile: 'chinese_ai_report.md' },
  { query: '自然语言处理技术', expectedFile: 'chinese_ai_report.md' },
  { query: '深度学习模型优化', expectedFile: 'open_source_llm_guide.md' },
  { query: '机器学习算法分类', expectedFile: 'chinese_ai_report.md' },
  { query: '神经网络架构设计', expectedFile: 'chinese_ai_report.md' },
  { query: '强化学习应用', expectedFile: 'chinese_ai_report.md' },
  { query: '知识图谱构建', expectedFile: 'chinese_ai_report.md' },
  { query: '数据挖掘技术', expectedFile: 'chinese_ai_report.md' },
  { query: '智能推荐系统', expectedFile: 'chinese_ai_report.md' },
  
  // 大模型 (10 个)
  { query: '大模型部署方案', expectedFile: 'open_source_llm_guide.md' },
  { query: '开源大模型对比', expectedFile: 'open_source_llm_guide.md' },
  { query: 'LoRA 微调方法', expectedFile: 'open_source_llm_guide.md' },
  { query: '大模型训练数据', expectedFile: 'open_source_llm_guide.md' },
  { query: '模型量化技术', expectedFile: 'open_source_llm_guide.md' },
  { query: '推理加速方案', expectedFile: 'open_source_llm_guide.md' },
  { query: 'LM Studio 使用', expectedFile: 'open_source_llm_guide.md' },
  { query: 'Ollama 部署', expectedFile: 'open_source_llm_guide.md' },
  { query: 'vLLM 性能优化', expectedFile: 'open_source_llm_guide.md' },
  { query: 'ModelScope 模型', expectedFile: 'open_source_llm_guide.md' },
  
  // 智慧城市 (10 个)
  { query: '智慧城市应用案例', expectedFile: 'chinese_ai_report.md' },
  { query: '城市大脑系统', expectedFile: 'chinese_ai_report.md' },
  { query: '智能交通管理', expectedFile: 'chinese_ai_report.md' },
  { query: '智慧医疗应用', expectedFile: 'chinese_ai_report.md' },
  { query: '智能城市设计', expectedFile: 'chinese_ai_report.md' },
  { query: '物联网系统', expectedFile: 'chinese_ai_report.md' },
  { query: '5G 通信技术', expectedFile: 'chinese_ai_report.md' },
  { query: '边缘计算部署', expectedFile: 'open_source_llm_guide.md' },
  { query: '云计算平台', expectedFile: 'chinese_ai_report.md' },
  { query: '区块链应用', expectedFile: 'chinese_ai_report.md' },
  
  // 开发实践 (10 个)
  { query: '微服务架构设计', expectedFile: 'chinese_ai_report.md' },
  { query: 'DevOps 实践', expectedFile: 'chinese_ai_report.md' },
  { query: '容器化部署', expectedFile: 'open_source_llm_guide.md' },
  { query: 'Kubernetes 集群', expectedFile: 'chinese_ai_report.md' },
  { query: 'CI/CD 流水线', expectedFile: 'chinese_ai_report.md' },
  { query: '代码质量评估', expectedFile: 'chinese_ai_report.md' },
  { query: '软件测试方法', expectedFile: 'chinese_ai_report.md' },
  { query: '敏捷开发流程', expectedFile: 'chinese_ai_report.md' },
  { query: 'API 设计规范', expectedFile: 'chinese_ai_report.md' },
  { query: '数据库优化', expectedFile: 'chinese_ai_report.md' },
  
  // 前沿技术 (10 个)
  { query: '量子计算进展', expectedFile: 'chinese_ai_report.md' },
  { query: '生物信息学', expectedFile: 'chinese_ai_report.md' },
  { query: '基因组学数据', expectedFile: 'chinese_ai_report.md' },
  { query: '药物研发 AI', expectedFile: 'chinese_ai_report.md' },
  { query: '金融风控模型', expectedFile: 'chinese_ai_report.md' },
  { query: '搜索引擎优化', expectedFile: 'chinese_ai_report.md' },
  { query: '网络安全防护', expectedFile: 'chinese_ai_report.md' },
  { query: '数据隐私保护', expectedFile: 'chinese_ai_report.md' },
  { query: 'GDPR 合规', expectedFile: 'chinese_ai_report.md' },
  { query: '技术趋势分析', expectedFile: 'chinese_ai_report.md' },
];

console.log(`📚 测试样本：${testSamples.length} 个`);

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
  
  const files = ['chinese_ai_report.md', 'open_source_llm_guide.md', 'test_document.md'];
  
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
console.log('\n🚀 开始多样本测试...\n');

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
console.log(`   测试样本：${testSamples.length}个`);
console.log(`   平均召回率：${(avgRecall * 100).toFixed(1)}%`);
console.log(`   满分数量：${perfectCount}/${testSamples.length} (${perfectRate.toFixed(1)}%)`);
console.log(`   通过率：${passCount}/${testSamples.length} (${passRate.toFixed(1)}%) (>= 92%)`);

// 分类统计
const categories = {
  'AI 技术': testSamples.slice(0, 10),
  '大模型': testSamples.slice(10, 20),
  '智慧城市': testSamples.slice(20, 30),
  '开发实践': testSamples.slice(30, 40),
  '前沿技术': testSamples.slice(40, 50),
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
const reportPath = join(PROJECT_ROOT, 'test', 'diverse_samples_test_report.json');
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
    'AI 技术': results.slice(0, 10).reduce((sum, r) => sum + r.recall, 0) / 10,
    '大模型': results.slice(10, 20).reduce((sum, r) => sum + r.recall, 0) / 10,
    '智慧城市': results.slice(20, 30).reduce((sum, r) => sum + r.recall, 0) / 10,
    '开发实践': results.slice(30, 40).reduce((sum, r) => sum + r.recall, 0) / 10,
    '前沿技术': results.slice(40, 50).reduce((sum, r) => sum + r.recall, 0) / 10,
  },
  results,
}, null, 2), 'utf-8');

console.log(`\n📄 测试报告已保存：${reportPath}`);

// 稳定性评估
console.log('\n' + '='.repeat(60));
console.log('稳定性评估');
console.log('='.repeat(60));

if (avgRecall >= 0.95 && passRate >= 95) {
  console.log('✅ 稳定性：优秀');
  console.log('   - 平均召回率 >= 95%');
  console.log('   - 通过率 >= 95%');
  console.log('   - 泛化能力强，可以投入生产使用');
} else if (avgRecall >= 0.90 && passRate >= 90) {
  console.log('✅ 稳定性：良好');
  console.log('   - 平均召回率 >= 90%');
  console.log('   - 通过率 >= 90%');
  console.log('   - 建议继续优化');
} else {
  console.log('⚠️  稳定性：需要优化');
  console.log('   - 平均召回率 < 90% 或 通过率 < 90%');
  console.log('   - 建议重新训练 CMA-ES 或增加测试样本');
}

console.log('='.repeat(60));

// 显示失败案例
const failedCases = results.filter(r => r.recall < 0.92);
if (failedCases.length > 0) {
  console.log(`\n⚠️  未通过案例 (${failedCases.length}个):`);
  for (const r of failedCases.slice(0, 5)) {
    console.log(`   - ${r.query}: ${(r.recall * 100).toFixed(1)}% (期望：${r.expectedFile}, 匹配：${r.matchedFile})`);
  }
  if (failedCases.length > 5) {
    console.log(`   ... 还有${failedCases.length - 5}个`);
  }
}

console.log('='.repeat(60));
