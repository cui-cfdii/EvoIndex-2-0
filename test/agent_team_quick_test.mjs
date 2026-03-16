/**
 * Agent Team 快速测试
 * 验证 Agent Team 基本功能
 */

import { QueryRewriteAgent, SimpleQueryOptimizer } from '../src/agents/query_rewrite_agent.mjs';

async function testSimpleOptimizer() {
  console.log('='.repeat(60));
  console.log('测试简单查询优化器（不依赖 LLM）');
  console.log('='.repeat(60));

  const optimizer = new SimpleQueryOptimizer();

  const testQueries = [
    '中国 AI 发展历程',
    '计算机视觉技术应用',
    '开源大模型部署方案',
    'LoRA 微调方法',
    '智慧城市应用案例'
  ];

  for (const query of testQueries) {
    console.log(`\n📝 查询："${query}"`);
    
    const expanded = optimizer.expandQuery(query);
    const keywords = optimizer.extractKeywords(query);
    
    console.log(`   扩展词：${expanded.slice(0, 10).join(', ')}...`);
    console.log(`   关键词：${keywords.join(', ')}`);
  }

  console.log('\n✅ 简单优化器测试完成');
}

async function testLLMAgent() {
  console.log('\n' + '='.repeat(60));
  console.log('测试 LLM 查询优化 Agent（需要 LM Studio）');
  console.log('='.repeat(60));

  const agent = new QueryRewriteAgent({
    baseURL: 'http://127.0.0.1:5000',
    model: 'qwen3.5-35b-a3b',
  });

  const testQuery = '中国 AI 发展历程';
  console.log(`\n📝 查询："${testQuery}"`);

  try {
    console.log('⏳ 正在调用 LLM 优化查询...');
    const result = await agent.optimizeQuery(testQuery);

    if (result.success) {
      console.log('✅ 优化成功！');
      console.log(`   意图：${result.optimized.intent}`);
      console.log(`   扩展查询：${result.optimized.expanded_queries.join(', ')}`);
      console.log(`   实体：${JSON.stringify(result.optimized.entities)}`);
      console.log(`   关键词：${result.optimized.keywords.join(', ')}`);
    } else {
      console.log(`⚠️  优化失败：${result.error}`);
    }
  } catch (error) {
    console.error(`❌ LLM 调用失败：${error.message}`);
    console.log('⚠️  请确保 LM Studio 运行在 http://127.0.0.1:5000');
  }
}

// 运行测试
(async () => {
  await testSimpleOptimizer();
  await testLLMAgent();
  
  console.log('\n' + '='.repeat(60));
  console.log('所有测试完成！');
  console.log('='.repeat(60));
})();
