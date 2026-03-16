/**
 * EvoIndex 2.0 本地记忆服务
 * 
 * 功能：提供本地记忆存储与检索（MEM0 降级方案）
 * 版本：v1.0
 * 创建时间：2026-03-15
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 记忆条目
 */
export class MemoryEntry {
  constructor(options = {}) {
    this.id = options.id || this.generateId();
    this.type = options.type || 'query'; // query, preference, feedback
    this.content = options.content || '';
    this.metadata = options.metadata || {};
    this.timestamp = options.timestamp || new Date().toISOString();
    this.tags = options.tags || [];
  }

  generateId() {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      content: this.content,
      metadata: this.metadata,
      timestamp: this.timestamp,
      tags: this.tags
    };
  }
}

/**
 * 本地记忆服务配置
 */
export class LocalMemoryConfig {
  constructor(options = {}) {
    // 记忆文件路径
    this.memoryDir = options.memoryDir || 
      join(__dirname, '../../data/memories');
    
    // 查询历史文件
    this.queryHistoryFile = join(this.memoryDir, 'query_history.jsonl');
    
    // 用户偏好文件
    this.preferencesFile = join(this.memoryDir, 'preferences.json');
    
    // 领域兴趣文件
    this.interestsFile = join(this.memoryDir, 'domain_interests.json');
    
    // 最大历史记录数
    this.maxQueryHistory = options.maxQueryHistory || 100;
    
    // 确保目录存在
    this.ensureDirectory();
  }

  ensureDirectory() {
    if (!existsSync(this.memoryDir)) {
      mkdirSync(this.memoryDir, { recursive: true });
    }
  }
}

/**
 * 本地记忆服务
 */
export class LocalMemoryService {
  constructor(config = new LocalMemoryConfig()) {
    this.config = config;
    this.initializeFiles();
  }

  /**
   * 初始化文件
   */
  initializeFiles() {
    // 查询历史文件
    if (!existsSync(this.config.queryHistoryFile)) {
      writeFileSync(this.config.queryHistoryFile, '', 'utf-8');
    }

    // 用户偏好文件
    if (!existsSync(this.config.preferencesFile)) {
      writeFileSync(this.config.preferencesFile, JSON.stringify({
        preferred_domains: [],
        query_count: 0,
        created_at: new Date().toISOString()
      }, null, 2), 'utf-8');
    }

    // 领域兴趣文件
    if (!existsSync(this.config.interestsFile)) {
      writeFileSync(this.config.interestsFile, JSON.stringify({
        domains: {},
        updated_at: new Date().toISOString()
      }, null, 2), 'utf-8');
    }
  }

  /**
   * 存储查询历史
   */
  async storeQuery(query, intent, results = []) {
    const entry = new MemoryEntry({
      type: 'query',
      content: query,
      metadata: {
        intent: intent,
        result_count: results.length,
        results: results.slice(0, 5) // 只存储前 5 个结果
      },
      tags: [intent?.type, intent?.domain].filter(Boolean)
    });

    // 追加到 JSONL 文件
    const line = JSON.stringify(entry.toJSON()) + '\n';
    appendFileSync(this.config.queryHistoryFile, line, 'utf-8');

    // 更新查询计数
    await this.incrementQueryCount();

    // 更新领域兴趣
    if (intent?.domain) {
      await this.updateDomainInterest(intent.domain);
    }

    return entry;
  }

  /**
   * 检索历史查询
   */
  async searchHistory(keyword, limit = 5) {
    if (!existsSync(this.config.queryHistoryFile)) {
      return [];
    }

    const content = readFileSync(this.config.queryHistoryFile, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    const memories = [];
    for (const line of lines.reverse()) { // 从最新到最旧
      try {
        const memory = JSON.parse(line);
        if (memory.content.includes(keyword) || 
            memory.metadata?.intent?.entities?.some(e => e.includes(keyword))) {
          memories.push(memory);
          if (memories.length >= limit) break;
        }
      } catch (error) {
        console.warn('⚠️ 解析记忆条目失败:', error);
      }
    }

    return memories;
  }

  /**
   * 获取用户偏好
   */
  async getUserPreferences() {
    const content = readFileSync(this.config.preferencesFile, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * 更新用户偏好
   */
  async updateUserPreferences(updates) {
    const prefs = await this.getUserPreferences();
    Object.assign(prefs, updates);
    prefs.updated_at = new Date().toISOString();
    writeFileSync(this.config.preferencesFile, JSON.stringify(prefs, null, 2), 'utf-8');
    return prefs;
  }

  /**
   * 增加查询计数
   */
  async incrementQueryCount() {
    const prefs = await this.getUserPreferences();
    prefs.query_count = (prefs.query_count || 0) + 1;
    await this.updateUserPreferences(prefs);
  }

  /**
   * 更新领域兴趣
   */
  async updateDomainInterest(domain, confidence = 0.1) {
    const content = readFileSync(this.config.interestsFile, 'utf-8');
    const interests = JSON.parse(content);

    if (!interests.domains[domain]) {
      interests.domains[domain] = {
        count: 0,
        confidence: 0,
        last_query: new Date().toISOString()
      };
    }

    interests.domains[domain].count++;
    interests.domains[domain].confidence = Math.min(
      1.0,
      interests.domains[domain].confidence + confidence
    );
    interests.domains[domain].last_query = new Date().toISOString();
    interests.updated_at = new Date().toISOString();

    writeFileSync(this.config.interestsFile, JSON.stringify(interests, null, 2), 'utf-8');
    return interests;
  }

  /**
   * 获取领域兴趣
   */
  async getDomainInterests() {
    const content = readFileSync(this.config.interestsFile, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * 获取首选领域（按兴趣排序）
   */
  async getPreferredDomains(limit = 3) {
    const interests = await this.getDomainInterests();
    const domains = Object.entries(interests.domains)
      .sort(([, a], [, b]) => b.confidence - a.confidence)
      .slice(0, limit);
    
    return domains.map(([domain, data]) => ({
      domain,
      ...data
    }));
  }

  /**
   * 存储用户反馈
   */
  async storeFeedback(query, feedback, rating) {
    const entry = new MemoryEntry({
      type: 'feedback',
      content: feedback,
      metadata: {
        query: query,
        rating: rating // 1-5 分
      },
      tags: ['feedback']
    });

    const line = JSON.stringify(entry.toJSON()) + '\n';
    appendFileSync(this.config.queryHistoryFile, line, 'utf-8');
    return entry;
  }

  /**
   * 清理旧记忆（保留最近的 N 条）
   */
  async cleanup(oldThan = 100) {
    if (!existsSync(this.config.queryHistoryFile)) {
      return;
    }

    const content = readFileSync(this.config.queryHistoryFile, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    if (lines.length > oldThan) {
      const recentLines = lines.slice(-oldThan);
      writeFileSync(this.config.queryHistoryFile, recentLines.join('\n') + '\n', 'utf-8');
      console.log(`✅ 清理记忆：${lines.length} → ${recentLines.length}`);
    }
  }

  /**
   * 导出所有记忆
   */
  async exportMemories() {
    const memories = {
      query_history: [],
      preferences: await this.getUserPreferences(),
      interests: await this.getDomainInterests()
    };

    if (existsSync(this.config.queryHistoryFile)) {
      const content = readFileSync(this.config.queryHistoryFile, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      memories.query_history = lines.map(line => JSON.parse(line));
    }

    return memories;
  }
}

/**
 * 主函数（测试用）
 */
async function main() {
  const memory = new LocalMemoryService();

  console.log('🧪 本地记忆服务测试\n');

  // 测试 1：存储查询
  console.log('1️⃣ 存储查询...');
  const entry = await memory.storeQuery(
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
  const results = await memory.searchHistory('肺结核', 3);
  console.log(`   ✅ 找到 ${results.length} 条记录`);

  // 测试 3：获取偏好
  console.log('\n3️⃣ 获取用户偏好...');
  const prefs = await memory.getUserPreferences();
  console.log(`   ✅ 查询次数：${prefs.query_count}`);

  // 测试 4：获取领域兴趣
  console.log('\n4️⃣ 获取领域兴趣...');
  const domains = await memory.getPreferredDomains(3);
  console.log(`   ✅ 首选领域：${domains.map(d => d.domain).join(', ')}`);

  console.log('\n🎉 测试完成！\n');
}

// 导出默认实例
export const localMemoryService = new LocalMemoryService();

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
