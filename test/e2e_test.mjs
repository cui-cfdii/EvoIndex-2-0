/**
 * EvoIndex 2.0 端到端测试
 * 
 * 测试完整流程：意图识别 → 记忆存储 → 自进化触发
 * 版本：v1.0
 * 创建时间：2026-03-15
 */

import { IntentClassifier, IntentType, Domain } from '../src/core/intent_classifier.mjs';
import { LocalMemoryService } from '../src/utils/local_memory_service.mjs';
import { EvolutionTrigger, TriggerEventType } from '../src/core/evolution_trigger.mjs';

/**
 * 测试场景
 */
const testScenarios = [
  {
    name: '场景 1：知识查询 + 低匹配度触发',
    query: '肺结核的治疗方案有哪些',
    expectedIntent: IntentType.KNOWLEDGE_QUERY,
    expectedDomain: Domain.MEDICAL_AI,
    matchRate: 0.5, // 低匹配度
    expectedTrigger: TriggerEventType.LOW_MATCH
  },
  {
    name: '场景 2：历史回忆',
    query: '我上次查的肺结核治疗方案呢？',
    expectedIntent: IntentType.HISTORY_RECALL,
    expectedDomain: null,
    matchRate: 0.9,
    expectedTrigger: null // 不触发学习
  },
  {
    name: '场景 3：术语解释',
    query: '什么是 RAG？',
    expectedIntent: IntentType.TERM_EXPLANATION,
    expectedDomain: Domain.LLM,
    matchRate: 0.7,
    expectedTrigger: TriggerEventType.LOW_MATCH
  },
  {
    name: '场景 4：领域探索',
    query: '介绍一下金融科技',
    expectedIntent: IntentType.DOMAIN_EXPLORATION,
    expectedDomain: Domain.FINTECH,
    matchRate: 0.8,
    expectedTrigger: null
  }
];

/**
 * 端到端测试服务
 */
class E2ETestService {
  constructor() {
    this.intentClassifier = new IntentClassifier();
    this.memory = new LocalMemoryService();
    this.trigger = new EvolutionTrigger();
    
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      details: []
    };
  }

  /**
   * 运行测试场景
   */
  async runScenario(scenario) {
    console.log(`\n📋 ${scenario.name}`);
    console.log('=' .repeat(60));

    const result = {
      scenario: scenario.name,
      query: scenario.query,
      steps: [],
      passed: true
    };

    // 步骤 1：意图识别
    console.log('1️⃣ 意图识别...');
    const intent = await this.intentClassifier.classify(scenario.query);
    const intentPass = intent.type === scenario.expectedIntent &&
                       (!scenario.expectedDomain || intent.domain === scenario.expectedDomain);
    
    result.steps.push({
      name: '意图识别',
      expected: { type: scenario.expectedIntent, domain: scenario.expectedDomain },
      actual: { type: intent.type, domain: intent.domain },
      passed: intentPass
    });
    
    console.log(`   意图：${intent.type} ${intentPass ? '✅' : '❌'}`);
    console.log(`   领域：${intent.domain || 'N/A'} ${intentPass ? '✅' : '❌'}`);

    // 步骤 2：存储查询
    console.log('\n2️⃣ 存储查询...');
    const memoryEntry = await this.memory.storeQuery(scenario.query, intent, []);
    const memoryPass = !!memoryEntry.id;
    
    result.steps.push({
      name: '存储查询',
      expected: { success: true },
      actual: { id: memoryEntry.id },
      passed: memoryPass
    });
    
    console.log(`   存储 ID：${memoryEntry.id} ${memoryPass ? '✅' : '❌'}`);

    // 步骤 3：自进化触发检测
    console.log('\n3️⃣ 自进化触发检测...');
    const triggerResult = await this.trigger.shouldTrigger(
      scenario.query,
      scenario.matchRate,
      { domain: intent.domain }
    );
    const triggerPass = triggerResult.reason === (scenario.expectedTrigger || 'no_trigger');
    
    result.steps.push({
      name: '自进化触发',
      expected: { trigger: scenario.expectedTrigger },
      actual: { trigger: triggerResult.reason },
      passed: triggerPass
    });
    
    console.log(`   触发：${triggerResult.reason} ${triggerPass ? '✅' : '❌'}`);

    // 总体结果
    result.passed = intentPass && memoryPass && triggerPass;
    this.results.total++;
    if (result.passed) {
      this.results.passed++;
      console.log('\n✅ 场景通过');
    } else {
      this.results.failed++;
      console.log('\n❌ 场景失败');
    }

    this.results.details.push(result);
    return result;
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🧪 EvoIndex 2.0 端到端测试\n');
    console.log('=' .repeat(60));

    for (const scenario of testScenarios) {
      await this.runScenario(scenario);
    }

    // 输出统计
    console.log('\n' + '=' .repeat(60));
    console.log('📊 测试统计');
    console.log('=' .repeat(60));
    console.log(`总测试数：${this.results.total}`);
    console.log(`通过：${this.results.passed}`);
    console.log(`失败：${this.results.failed}`);
    console.log(`通过率：${(this.results.passed / this.results.total * 100).toFixed(1)}%`);

    // 输出详细结果
    console.log('\n📋 详细结果:');
    for (const detail of this.results.details) {
      const icon = detail.passed ? '✅' : '❌';
      console.log(`${icon} ${detail.scenario}`);
    }

    // 触发器统计
    console.log('\n📡 触发器统计:');
    const stats = this.trigger.getStats();
    console.log(`总触发数：${stats.total}`);
    console.log(`按类型：`, stats.byType);

    // 记忆统计
    console.log('\n💾 记忆统计:');
    const prefs = await this.memory.getUserPreferences();
    console.log(`查询次数：${prefs.query_count}`);
    const domains = await this.memory.getPreferredDomains(3);
    console.log(`首选领域：${domains.map(d => d.domain).join(', ') || '无'}`);

    console.log('\n🎉 测试完成！\n');

    return this.results;
  }
}

/**
 * 主函数
 */
async function main() {
  const tester = new E2ETestService();
  const results = await tester.runAllTests();

  // 输出 JSON 结果
  console.log('📄 JSON 结果:');
  console.log(JSON.stringify(results, null, 2));
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

// 导出
export { E2ETestService };
