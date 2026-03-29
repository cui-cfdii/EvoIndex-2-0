/**
 * EvoIndex 2.0 MEM0 集成模块
 * 
 * 功能：整合 MEM0 服务和本地记忆服务（含降级方案）
 * 版本：v1.0
 * 创建时间：2026-03-15
 */

import { LocalMemoryService } from '../utils/local_memory_service.mjs';

/**
 * MEM0 集成配置
 */
export class Mem0IntegrationConfig {
  constructor(options = {}) {
    // MEM0 API 配置
    this.mem0ApiKey = process.env.MEMOS_API_KEY;
    this.mem0BaseUrl = process.env.MEMOS_BASE_URL || 
      'https://memos.memtensor.cn/api/openmem/v1';
    this.mem0UserId = process.env.MEMOS_USER_ID || 
      'ou_94670ed1bd8c48afe8775cd995441ab1';
    
    // 是否启用 MEM0
    this.useMem0 = options.useMem0 ?? true;
    
    // 降级策略
    this.fallbackToLocal = options.fallbackToLocal ?? true;
    
    // 权重配置
    this.weights = {
      personalContext: 0.4,
      knowledgeRetrieval: 0.6,
      ...options.weights
    };
  }
}

/**
 * MEM0 集成服务
 */
export class Mem0IntegrationService {
  constructor(config = new Mem0IntegrationConfig()) {
    this.config = config;
    this.localMemory = new LocalMemoryService();
    this.mode = 'unknown';
    
    // 初始化并检测可用服务
    this.initialize();
  }

  /**
   * 初始化并检测可用服务
   */
  async initialize() {
    // 检测 MEM0 API 是否可用
    if (this.config.useMem0 && this.config.mem0ApiKey) {
      try {
        // TODO: 实现 MEM0 API 连接测试
        // const available = await this.testMem0Connection();
        // if (available) {
        //   this.mode = 'mem0';
        //   console.log('✅ MEM0 服务已启用');
        //   return;
        // }
        
        // 暂时降级到本地记忆
        this.mode = 'local';
        console.log('⚠️  降级到本地记忆服务');
      } catch (error) {
        console.warn('⚠️  MEM0 服务不可用，降级到本地记忆');
        this.mode = 'local';
      }
    } else {
      this.mode = 'local';
      console.log('ℹ️  使用本地记忆服务');
    }
  }

  /**
   * 存储查询
   */
  async storeQuery(query, intent, results = []) {
    try {
      if (this.mode === 'mem0') {
        // TODO: 调用 MEM0 API
        // return await this.mem0StoreQuery(query, intent, results);
        return await this.localMemory.storeQuery(query, intent, results);
      } else {
        return await this.localMemory.storeQuery(query, intent, results);
      }
    } catch (error) {
      console.error('❌ 存储查询失败:', error);
      throw error;
    }
  }

  /**
   * 检索历史
   */
  async searchHistory(keyword, limit = 5) {
    try {
      if (this.mode === 'mem0') {
        // TODO: 调用 MEM0 API
        // return await this.mem0SearchHistory(keyword, limit);
        return await this.localMemory.searchHistory(keyword, limit);
      } else {
        return await this.localMemory.searchHistory(keyword, limit);
      }
    } catch (error) {
      console.error('❌ 检索历史失败:', error);
      return [];
    }
  }

  /**
   * 获取用户偏好
   */
  async getUserPreferences() {
    try {
      if (this.mode === 'mem0') {
        // TODO: 调用 MEM0 API
        // return await this.mem0GetUserPreferences();
        return await this.localMemory.getUserPreferences();
      } else {
        return await this.localMemory.getUserPreferences();
      }
    } catch (error) {
      console.error('❌ 获取用户偏好失败:', error);
      return {};
    }
  }

  /**
   * 获取首选领域
   */
  async getPreferredDomains(limit = 3) {
    try {
      return await this.localMemory.getPreferredDomains(limit);
    } catch (error) {
      console.error('❌ 获取首选领域失败:', error);
      return [];
    }
  }

  /**
   * 更新领域兴趣
   */
  async updateDomainInterest(domain, confidence = 0.1) {
    try {
      return await this.localMemory.updateDomainInterest(domain, confidence);
    } catch (error) {
      console.error('❌ 更新领域兴趣失败:', error);
      return null;
    }
  }

  /**
   * 获取领域兴趣（代理方法）
   */
  async getDomainInterests() {
    try {
      return await this.localMemory.getDomainInterests();
    } catch (error) {
      console.error('❌ 获取领域兴趣失败:', error);
      return { domains: {} };
    }
  }

  /**
   * 存储反馈
   */
  async storeFeedback(query, feedback, rating) {
    try {
      return await this.localMemory.storeFeedback(query, feedback, rating);
    } catch (error) {
      console.error('❌ 存储反馈失败:', error);
      throw error;
    }
  }

  /**
   * 增强查询（结合个人上下文和专业知识）
   */
  async enhanceQuery(query, evoIndexResults) {
    // 获取用户偏好
    const prefs = await this.getUserPreferences();
    const preferredDomains = await this.getPreferredDomains(3);

    // 获取相关历史
    const history = await this.searchHistory(query.split(' ').slice(0, 3).join(' '), 3);

    // 融合结果
    const enhanced = {
      original_query: query,
      user_preferences: prefs,
      preferred_domains: preferredDomains,
      related_history: history,
      evoindex_results: evoIndexResults,
      fusion: this.fuseResults(evoIndexResults, history, preferredDomains)
    };

    return enhanced;
  }

  /**
   * 融合结果
   */
  fuseResults(evoIndexResults, history, preferredDomains) {
    // 简单实现：按优先级排序
    // TODO: 实现更复杂的融合算法
    
    const fused = [];

    // 1. 优先历史相关结果
    if (history.length > 0) {
      fused.push(...history.map(h => ({
        type: 'history',
        ...h
      })));
    }

    // 2. 专业知识结果
    if (evoIndexResults) {
      fused.push(...evoIndexResults.map(r => ({
        type: 'knowledge',
        ...r
      })));
    }

    return fused;
  }

  /**
   * 清理旧记忆
   */
  async cleanup(oldThan = 100) {
    try {
      await this.localMemory.cleanup(oldThan);
    } catch (error) {
      console.error('❌ 清理记忆失败:', error);
    }
  }

  /**
   * 导出所有记忆
   */
  async exportMemories() {
    try {
      return await this.localMemory.exportMemories();
    } catch (error) {
      console.error('❌ 导出记忆失败:', error);
      return {};
    }
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      mode: this.mode,
      useMem0: this.config.useMem0,
      fallbackToLocal: this.config.fallbackToLocal,
      weights: this.config.weights
    };
  }
}

/**
 * 主函数（测试用）
 */
async function main() {
  const mem0 = new Mem0IntegrationService();

  console.log('🧪 MEM0 集成服务测试\n');
  console.log('服务状态:', mem0.getStatus());

  // 测试 1：存储查询
  console.log('\n1️⃣ 存储查询...');
  const entry = await mem0.storeQuery(
    '肺结核的治疗方案有哪些',
    {
      type: 'knowledge_query',
      domain: 'medical_ai',
      entities: ['肺结核', '治疗', '方案']
    },
    ['doc1.md', 'doc2.md']
  );
  console.log(`   ✅ 存储成功：${entry.id}`);

  // 测试 2：检索历史
  console.log('\n2️⃣ 检索历史...');
  const results = await mem0.searchHistory('肺结核', 3);
  console.log(`   ✅ 找到 ${results.length} 条记录`);

  // 测试 3：获取偏好
  console.log('\n3️⃣ 获取用户偏好...');
  const prefs = await mem0.getUserPreferences();
  console.log(`   ✅ 查询次数：${prefs.query_count}`);

  // 测试 4：获取领域兴趣
  console.log('\n4️⃣ 获取领域兴趣...');
  const domains = await mem0.getPreferredDomains(3);
  console.log(`   ✅ 首选领域：${domains.map(d => d.domain).join(', ')}`);

  console.log('\n🎉 测试完成！\n');
}

// 导出默认实例
export const mem0IntegrationService = new Mem0IntegrationService();

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
