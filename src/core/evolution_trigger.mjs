/**
 * EvoIndex 2.0 自进化触发器
 * 
 * 功能：检测低匹配度查询，触发学习流程
 * 版本：v1.0
 * 创建时间：2026-03-15
 */

import { mem0IntegrationService } from '../core/mem0_integration.mjs';

/**
 * 自进化触发器配置
 */
export class EvolutionTriggerConfig {
  constructor(options = {}) {
    // 匹配度阈值
    this.matchThreshold = options.matchThreshold ?? 0.8;
    
    // 召回率阈值
    this.recallThreshold = options.recallThreshold ?? 0.92;
    
    // 频繁查询阈值（次/周）
    this.frequentQueryThreshold = options.frequentQueryThreshold ?? 3;
    
    // 是否启用自进化
    this.enabled = options.enabled ?? true;
    
    // 是否记录触发事件
    this.logEvents = options.logEvents ?? true;
  }
}

/**
 * 触发事件类型
 */
export const TriggerEventType = {
  LOW_MATCH: 'low_match',           // 低匹配度
  NEW_DOMAIN: 'new_domain',         // 新领域
  FREQUENT_QUERY: 'frequent_query', // 频繁查询
  USER_INTEREST: 'user_interest',   // 用户兴趣
  LOW_RECALL: 'low_recall'          // 低召回率
};

/**
 * 触发事件
 */
export class TriggerEvent {
  constructor(options = {}) {
    this.id = this.generateId();
    this.type = options.type;
    this.query = options.query;
    this.matchRate = options.matchRate;
    this.conditions = options.conditions || {};
    this.timestamp = options.timestamp || new Date().toISOString();
    this.action = options.action || 'learn'; // learn, ignore, defer
  }

  generateId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      query: this.query,
      matchRate: this.matchRate,
      conditions: this.conditions,
      timestamp: this.timestamp,
      action: this.action
    };
  }
}

/**
 * 自进化触发器
 */
export class EvolutionTrigger {
  constructor(config = new EvolutionTriggerConfig()) {
    this.config = config;
    this.mem0 = mem0IntegrationService;
    this.eventHistory = [];
  }

  /**
   * 是否应该触发自进化
   */
  async shouldTrigger(query, matchRate, context = {}) {
    if (!this.config.enabled) {
      return { should: false, reason: 'disabled' };
    }

    // 1. 检测低匹配度
    if (matchRate < this.config.matchThreshold) {
      const event = new TriggerEvent({
        type: TriggerEventType.LOW_MATCH,
        query: query,
        matchRate: matchRate,
        conditions: {
          threshold: this.config.matchThreshold,
          actual: matchRate
        }
      });
      
      await this.logEvent(event);
      return { 
        should: true, 
        reason: 'low_match',
        event: event
      };
    }

    // 2. 检测新领域
    if (context.domain && await this.isNewDomain(context.domain)) {
      const event = new TriggerEvent({
        type: TriggerEventType.NEW_DOMAIN,
        query: query,
        matchRate: matchRate,
        conditions: {
          domain: context.domain
        }
      });
      
      await this.logEvent(event);
      return { 
        should: true, 
        reason: 'new_domain',
        event: event
      };
    }

    // 3. 检测频繁查询
    if (await this.isFrequentQuery(query)) {
      const event = new TriggerEvent({
        type: TriggerEventType.FREQUENT_QUERY,
        query: query,
        matchRate: matchRate,
        conditions: {
          threshold: this.config.frequentQueryThreshold
        }
      });
      
      await this.logEvent(event);
      return { 
        should: true, 
        reason: 'frequent_query',
        event: event
      };
    }

    // 4. 检测用户兴趣
    if (context.domain && await this.checkUserInterest(context.domain)) {
      const event = new TriggerEvent({
        type: TriggerEventType.USER_INTEREST,
        query: query,
        matchRate: matchRate,
        conditions: {
          domain: context.domain
        }
      });
      
      await this.logEvent(event);
      return { 
        should: true, 
        reason: 'user_interest',
        event: event
      };
    }

    return { should: false, reason: 'no_trigger' };
  }

  /**
   * 检测是否是新领域
   */
  async isNewDomain(domain) {
    const interests = await this.mem0.getDomainInterests();
    return !interests.domains[domain];
  }

  /**
   * 检测是否是频繁查询
   */
  async isFrequentQuery(query) {
    const history = await this.mem0.searchHistory(query.split(' ').slice(0, 3).join(' '), 100);
    
    // 统计最近 7 天的查询次数
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentCount = history.filter(h => {
      const date = new Date(h.timestamp);
      return date >= sevenDaysAgo;
    }).length;

    return recentCount >= this.config.frequentQueryThreshold;
  }

  /**
   * 检查用户兴趣
   */
  async checkUserInterest(domain) {
    const preferredDomains = await this.mem0.getPreferredDomains(5);
    return preferredDomains.some(d => d.domain === domain && d.confidence >= 0.5);
  }

  /**
   * 记录触发事件
   */
  async logEvent(event) {
    if (!this.config.logEvents) {
      return;
    }

    this.eventHistory.push(event);
    
    // 存储到记忆系统
    await this.mem0.storeQuery(
      `Trigger: ${event.type} - ${event.query}`,
      {
        type: 'trigger_event',
        event: event.toJSON()
      },
      []
    );

    console.log(`📡 触发事件：${event.type} - "${event.query}" (匹配度：${(event.matchRate * 100).toFixed(1)}%)`);
  }

  /**
   * 获取触发历史
   */
  getTriggerHistory(limit = 10) {
    return this.eventHistory.slice(-limit).map(e => e.toJSON());
  }

  /**
   * 清除触发历史
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const stats = {
      total: this.eventHistory.length,
      byType: {},
      byReason: {}
    };

    for (const event of this.eventHistory) {
      // 按类型统计
      if (!stats.byType[event.type]) {
        stats.byType[event.type] = 0;
      }
      stats.byType[event.type]++;

      // 按原因统计
      const reason = event.conditions?.reason || 'unknown';
      if (!stats.byReason[reason]) {
        stats.byReason[reason] = 0;
      }
      stats.byReason[reason]++;
    }

    return stats;
  }
}

/**
 * 主函数（测试用）
 */
async function main() {
  const trigger = new EvolutionTrigger();

  console.log('🧪 自进化触发器测试\n');

  // 测试 1：低匹配度触发
  console.log('1️⃣ 测试低匹配度触发...');
  const result1 = await trigger.shouldTrigger('量子计算原理', 0.5);
  console.log(`   结果：${result1.should ? '✅ 触发' : '❌ 不触发'} (${result1.reason})`);

  // 测试 2：正常查询不触发
  console.log('\n2️⃣ 测试正常查询...');
  const result2 = await trigger.shouldTrigger('AI 大模型', 0.9);
  console.log(`   结果：${result2.should ? '✅ 触发' : '❌ 不触发'} (${result2.reason})`);

  // 测试 3：获取统计
  console.log('\n3️⃣ 获取统计信息...');
  const stats = trigger.getStats();
  console.log(`   总触发数：${stats.total}`);
  console.log(`   按类型：`, stats.byType);

  // 测试 4：获取触发历史
  console.log('\n4️⃣ 获取触发历史...');
  const history = trigger.getTriggerHistory(5);
  console.log(`   最近触发：${history.length} 条`);

  console.log('\n🎉 测试完成！\n');
}

// 导出默认实例
export const evolutionTrigger = new EvolutionTrigger();

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
