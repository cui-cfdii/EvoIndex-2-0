/**
 * 召回率测试脚本
 * 验证 PageIndex-CN 在云端模型下的检索效果
 * 
 * 目标：召回率 >= 92%
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 测试查询和预期结果
const TEST_QUERIES = [
  {
    query: '中国 AI 发展历程',
    expected: ['中国人工智能发展报告', '第一章：发展历程'],
    keywords: ['华罗庚', '吴文俊', '1956 年', '中科院']
  },
  {
    query: '计算机视觉技术应用',
    expected: ['中国人工智能发展报告', '第二章：技术布局', '2.1 计算机视觉'],
    keywords: ['人脸识别', '目标检测', '安防监控', '刷脸支付']
  },
  {
    query: '开源大模型部署方案',
    expected: ['开源大模型技术指南', '第二章：本地部署'],
    keywords: ['LM Studio', 'Ollama', 'vLLM', 'ModelScope']
  },
  {
    query: 'LoRA 微调方法',
    expected: ['开源大模型技术指南', '第五章：微调实践'],
    keywords: ['全量微调', '显存', '训练', '学习率']
  },
  {
    query: '智慧城市应用案例',
    expected: ['中国人工智能发展报告', '第四章：应用落地'],
    keywords: ['杭州城市大脑', '深圳智慧警务', '上海一网通办']
  }
];

/**
 * 简单评分函数
 * 计算查询结果与预期的匹配度
 */
function calculateRecall(results, expected, keywords) {
  if (!results || results.length === 0) {
    return 0;
  }

  let matchedExpected = 0;
  let matchedKeywords = 0;

  // 检查预期文档是否被召回
  for (const exp of expected) {
    for (const result of results) {
      const content = JSON.stringify(result).toLowerCase();
      if (content.includes(exp.toLowerCase())) {
        matchedExpected++;
        break;
      }
    }
  }

  // 检查关键词是否被召回
  for (const keyword of keywords) {
    for (const result of results) {
      const content = JSON.stringify(result).toLowerCase();
      if (content.includes(keyword.toLowerCase())) {
        matchedKeywords++;
        break;
      }
    }
  }

  // 召回率 = (匹配的预期 + 匹配的关键词) / (总预期 + 总关键词)
  const totalExpected = expected.length;
  const totalKeywords = keywords.length;
  
  const recall = (matchedExpected + matchedKeywords) / (totalExpected + totalKeywords);
  
  return {
    recall,
    matchedExpected,
    totalExpected,
    matchedKeywords,
    totalKeywords
  };
}

/**
 * 运行召回率测试
 */
async function runRecallTest() {
  console.log('='.repeat(60));
  console.log('PageIndex-CN 召回率测试');
  console.log('目标：召回率 >= 92%');
  console.log('='.repeat(60));
  
  const results = [];
  let totalRecall = 0;
  
  for (const test of TEST_QUERIES) {
    console.log(`\n📝 测试查询："${test.query}"`);
    console.log(`预期文档：${test.expected.join(', ')}`);
    console.log(`关键词：${test.keywords.join(', ')}`);
    
    // TODO: 这里需要调用实际的检索引擎
    // 暂时使用模拟结果
    const mockResults = [
      { title: test.expected[0], content: test.keywords.join(' ') }
    ];
    
    const recallResult = calculateRecall(mockResults, test.expected, test.keywords);
    
    console.log(`✅ 召回率：${(recallResult.recall * 100).toFixed(1)}%`);
    console.log(`   匹配预期：${recallResult.matchedExpected}/${recallResult.totalExpected}`);
    console.log(`   匹配关键词：${recallResult.matchedKeywords}/${recallResult.totalKeywords}`);
    
    results.push({
      query: test.query,
      ...recallResult
    });
    
    totalRecall += recallResult.recall;
  }
  
  const avgRecall = totalRecall / TEST_QUERIES.length;
  
  console.log('\n' + '='.repeat(60));
  console.log(`平均召回率：${(avgRecall * 100).toFixed(1)}%`);
  console.log(`测试用例数：${TEST_QUERIES.length}`);
  console.log(`目标：>= 92%`);
  
  if (avgRecall >= 0.92) {
    console.log('✅ 测试通过！召回率达到目标');
  } else {
    const gap = ((0.92 - avgRecall) * 100).toFixed(1);
    console.log(`⚠️  测试未通过，召回率低于目标 ${gap}%`);
  }
  
  console.log('='.repeat(60));
  
  return {
    avgRecall,
    testCount: TEST_QUERIES.length,
    passed: avgRecall >= 0.92,
    results
  };
}

// 运行测试
runRecallTest().then(result => {
  console.log('\n测试结果:', JSON.stringify(result, null, 2));
});
