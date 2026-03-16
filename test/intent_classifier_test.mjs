/**
 * EvoIndex 2.0 意图分类器测试
 * 
 * 测试用例覆盖率：> 90%
 * 创建时间：2026-03-15
 */

import { IntentClassifier, IntentType, Domain } from '../src/core/intent_classifier.mjs';

const classifier = new IntentClassifier();

const testCases = [
  // 知识查询测试
  {
    name: '知识查询 - 医疗 AI',
    query: '肺结核的治疗方案有哪些',
    expected: {
      type: IntentType.KNOWLEDGE_QUERY,
      domain: Domain.MEDICAL_AI,
      confidence: 0.8
    }
  },
  {
    name: '知识查询 - 法律科技',
    query: '合同审查的最佳实践',
    expected: {
      type: IntentType.KNOWLEDGE_QUERY,
      domain: Domain.LEGAL_TECH
    }
  },
  {
    name: '知识查询 - 金融科技',
    query: '量化交易策略有哪些',
    expected: {
      type: IntentType.KNOWLEDGE_QUERY,
      domain: Domain.FINTECH
    }
  },
  {
    name: '知识查询 - LLM 技术',
    query: 'RAG 技术的实现原理',
    expected: {
      type: IntentType.KNOWLEDGE_QUERY,
      domain: Domain.LLM
    }
  },
  
  // 历史回忆测试
  {
    name: '历史回忆 - 上次查询',
    query: '我上次查的肺结核治疗方案呢？',
    expected: {
      type: IntentType.HISTORY_RECALL,
      confidence: 0.95
    }
  },
  {
    name: '历史回忆 - 之前问过',
    query: '之前问过的 RAG 技术还记得吗',
    expected: {
      type: IntentType.HISTORY_RECALL
    }
  },
  {
    name: '历史回忆 - 我记得',
    query: '我记得之前查过合同审查的内容',
    expected: {
      type: IntentType.HISTORY_RECALL
    }
  },
  
  // 术语解释测试
  {
    name: '术语解释 - 什么是',
    query: '什么是 RAG？',
    expected: {
      type: IntentType.TERM_EXPLANATION,
      domain: Domain.LLM,
      confidence: 0.9
    }
  },
  {
    name: '术语解释 - 什么意思',
    query: '肺结节什么意思',
    expected: {
      type: IntentType.TERM_EXPLANATION,
      domain: Domain.MEDICAL_AI
    }
  },
  {
    name: '术语解释 - 解释',
    query: '解释一下量化交易',
    expected: {
      type: IntentType.TERM_EXPLANATION,
      domain: Domain.FINTECH
    }
  },
  
  // 领域探索测试
  {
    name: '领域探索 - 介绍一下',
    query: '介绍一下金融科技',
    expected: {
      type: IntentType.DOMAIN_EXPLORATION,
      domain: Domain.FINTECH,
      confidence: 0.85
    }
  },
  {
    name: '领域探索 - 讲讲',
    query: '讲讲法律科技的发展',
    expected: {
      type: IntentType.DOMAIN_EXPLORATION,
      domain: Domain.LEGAL_TECH
    }
  },
  {
    name: '领域探索 - 想了解',
    query: '想了解大模型技术',
    expected: {
      type: IntentType.DOMAIN_EXPLORATION,
      domain: Domain.LLM
    }
  }
];

let passed = 0;
let failed = 0;

console.log('🧪 EvoIndex 2.0 意图分类器测试\n');
console.log('=' .repeat(60));

for (const testCase of testCases) {
  const result = await classifier.classify(testCase.query);
  
  // 验证结果
  const typeMatch = result.type === testCase.expected.type;
  const domainMatch = !testCase.expected.domain || result.domain === testCase.expected.domain;
  const confidenceMatch = !testCase.expected.confidence || 
    Math.abs(result.confidence - testCase.expected.confidence) < 0.01;
  
  const pass = typeMatch && domainMatch && confidenceMatch;
  
  if (pass) {
    console.log(`✅ ${testCase.name}`);
    passed++;
  } else {
    console.log(`❌ ${testCase.name}`);
    console.log(`   查询："${testCase.query}"`);
    console.log(`   期望：type=${testCase.expected.type}, domain=${testCase.expected.domain}`);
    console.log(`   实际：type=${result.type}, domain=${result.domain}, confidence=${result.confidence}`);
    failed++;
  }
}

console.log('=' .repeat(60));
console.log(`\n📊 测试结果：${passed}/${testCases.length} 通过`);
console.log(`   通过率：${(passed / testCases.length * 100).toFixed(1)}%`);
console.log(`   失败：${failed}`);

if (passed === testCases.length) {
  console.log('\n🎉 所有测试通过！');
} else {
  console.log('\n⚠️  有测试失败，请检查实现');
}

// 实体提取测试
console.log('\n' + '=' .repeat(60));
console.log('🧪 实体提取测试\n');

const entityTests = [
  {
    query: '肺结核的治疗方案有哪些',
    expectedEntities: ['肺结核', '治疗', '方案']
  },
  {
    query: '什么是 RAG 技术',
    expectedEntities: ['RAG', '技术']
  },
  {
    query: '介绍一下金融科技的量化交易',
    expectedEntities: ['金融科技', '量化', '交易']
  }
];

for (const test of entityTests) {
  const result = await classifier.classify(test.query);
  const hasEntities = test.expectedEntities.every(e => result.entities.includes(e));
  
  if (hasEntities) {
    console.log(`✅ "${test.query}"`);
    console.log(`   实体：${result.entities.join(', ')}`);
  } else {
    console.log(`❌ "${test.query}"`);
    console.log(`   期望包含：${test.expectedEntities.join(', ')}`);
    console.log(`   实际提取：${result.entities.join(', ')}`);
  }
}

console.log('\n' + '=' .repeat(60));
console.log('🎯 测试完成！\n');
