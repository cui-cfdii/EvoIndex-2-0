# MEM0 + EvoIndex 2.0 集成方案

**版本**: v1.0  
**创建时间**: 2026-03-15 12:51  
**设计**: 军机处（耗电马喽）+ 中书省（agent-deep-research）

---

## 🎯 集成目标

结合 **MEM0 的个人记忆能力** 和 **EvoIndex 的知识检索能力**，打造真正的智能知识管家。

---

## 📊 系统定位

| 系统 | 职责 | 记忆类型 | 特点 |
|------|------|---------|------|
| **MEM0** | 用户记忆 | 个人化记忆 | 偏好、习惯、历史查询 |
| **EvoIndex** | 知识记忆 | 专业化记忆 | 术语、文献、领域知识 |
| **集成后** | 双记忆协同 | 个人化 + 专业化 | 懂用户 + 懂知识 |

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    用户查询                              │
│          "我上次查的肺结核治疗方案呢？"                   │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│              意图识别层 (Intent Layer)                   │
│  1. 识别查询类型：history_recall（历史回忆）             │
│  2. 提取实体：["肺结核", "治疗方案"]                     │
│  3. 时间线索："上次" → 最近一次                          │
└──────────────────┬──────────────────────────────────────┘
                   ↓
         ┌─────────┴─────────┐
         ↓                   ↓
┌─────────────────┐ ┌─────────────────┐
│   MEM0 记忆层   │ │  EvoIndex 知识层 │
│                 │ │                 │
│ • 查询历史      │ │ • 术语匹配      │
│ • 用户偏好      │ │ • 文档检索      │
│ • 领域兴趣      │ │ • 召回率验证    │
│                 │ │                 │
│ API Key:        │ │ 术语词典：      │
│ mpg-e8w55...    │ │ 226 术语 (5 领域)  │
└────────┬────────┘ └────────┬────────┘
         ↓                   ↓
┌─────────────────────────────────────────────────────────┐
│              融合层 (Fusion Layer)                       │
│  1. MEM0 提供上下文：用户偏好医疗 AI、上次查询时间        │
│  2. EvoIndex 提供知识：肺结核治疗术语、相关文档          │
│  3. 加权融合：个人上下文 40% + 专业知识 60%             │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│                    返回结果                              │
│ "陛下，您上次（2026-03-15 11:18）查询的肺结核治疗方案：  │
│  - 异烟肼 + 利福平 + 吡嗪酰胺（标准三联）                │
│  - 疗程：6 个月                                          │
│  - 注意事项：肝功能监测                                  │
│  需要臣详细解释吗？"                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🔌 技术实现

### 1. MEM0 配置模块

**文件**: `src/utils/mem0_client.mjs`

```javascript
import { Mem0Client } from 'mem0-client';

const MEM0_CONFIG = {
  apiKey: process.env.MEMOS_API_KEY, // mpg-e8w55RiU92S2BEJglK5nYJasUD6rx4yHyxpcvVeo
  baseUrl: 'https://memos.memtensor.cn/api/openmem/v1',
  userId: 'ou_94670ed1bd8c48afe8775cd995441ab1' // 飞书用户 ID
};

export class Mem0Service {
  constructor() {
    this.client = new Mem0Client(MEM0_CONFIG);
  }

  // 存储查询历史
  async storeQuery(query, intent, results) {
    await this.client.memories.add({
      user_id: MEM0_CONFIG.userId,
      content: query,
      metadata: {
        type: 'query_history',
        intent: intent,
        timestamp: new Date().toISOString(),
        result_count: results.length
      }
    });
  }

  // 检索历史查询
  async searchHistory(keyword, limit = 5) {
    const memories = await this.client.memories.search({
      user_id: MEM0_CONFIG.userId,
      query: keyword,
      limit: limit,
      filters: {
        type: 'query_history'
      }
    });
    return memories;
  }

  // 获取用户偏好
  async getUserPreferences() {
    const prefs = await this.client.memories.get({
      user_id: MEM0_CONFIG.userId,
      filters: {
        type: 'preference'
      }
    });
    return prefs;
  }

  // 更新领域兴趣
  async updateDomainInterest(domain, confidence) {
    await this.client.memories.add({
      user_id: MEM0_CONFIG.userId,
      content: `对${domain}领域感兴趣`,
      metadata: {
        type: 'domain_interest',
        domain: domain,
        confidence: confidence,
        updated_at: new Date().toISOString()
      }
    });
  }
}
```

---

### 2. EvoIndex 增强模块

**文件**: `src/core/mem0_integration.mjs`

```javascript
import { Mem0Service } from '../utils/mem0_client.mjs';

export class EvoIndexMem0Integration {
  constructor(evoIndexInstance) {
    this.evoIndex = evoIndexInstance;
    this.mem0 = new Mem0Service();
  }

  // 增强查询：结合 MEM0 上下文
  async enhancedQuery(query) {
    // 1. 意图识别
    const intent = await this.classifyIntent(query);
    
    // 2. 检查是否是历史回忆
    if (intent.type === 'history_recall') {
      const history = await this.mem0.searchHistory(intent.entities[0]);
      if (history.length > 0) {
        return this.formatHistoryResult(history[0]);
      }
    }
    
    // 3. 获取用户偏好
    const prefs = await this.mem0.getUserPreferences();
    const preferredDomain = this.extractPreferredDomain(prefs);
    
    // 4. EvoIndex 检索（优先用户偏好领域）
    const results = await this.evoIndex.query(query, {
      preferredDomain: preferredDomain,
      boostFactor: 1.5 // 偏好领域权重提升 50%
    });
    
    // 5. 存储查询历史到 MEM0
    await this.mem0.storeQuery(query, intent, results);
    
    // 6. 更新领域兴趣
    if (results.domain) {
      await this.mem0.updateDomainInterest(
        results.domain,
        results.confidence
      );
    }
    
    return results;
  }

  // 意图识别（增强版）
  async classifyIntent(query) {
    // 检测历史回忆关键词
    const historyKeywords = ['上次', '之前', '曾经', '上次查', '上次问'];
    const isHistory = historyKeywords.some(kw => query.includes(kw));
    
    if (isHistory) {
      return {
        type: 'history_recall',
        entities: this.extractEntities(query),
        confidence: 0.9
      };
    }
    
    // 原有意图识别逻辑
    return this.evoIndex.classifyIntent(query);
  }

  // 格式化历史结果
  formatHistoryResult(memory) {
    return {
      type: 'history',
      query: memory.content,
      timestamp: memory.metadata.timestamp,
      results: memory.metadata.results,
      formatted: `您于${this.formatDate(memory.metadata.timestamp)}查询过：${memory.content}`
    };
  }

  formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
```

---

### 3. 自进化触发器增强

**文件**: `src/core/evolution_trigger_mem0.mjs`

```javascript
export class EvolutionTriggerWithMem0 {
  constructor(evoIndex, mem0) {
    this.evoIndex = evoIndex;
    this.mem0 = mem0;
  }

  // 触发条件检测（增强版）
  async shouldTrigger(query, matchRate) {
    // 原有触发条件
    const baseConditions = {
      lowMatch: matchRate < 0.8,
      newDomain: this.evoIndex.isNewDomain(query),
      lowRecall: await this.evoIndex.checkRecall(query) < 0.92
    };

    // MEM0 增强条件
    const mem0Conditions = {
      frequentQuery: await this.mem0.isFrequentQuery(query),
      userInterest: await this.mem0.checkUserInterest(query),
      historicalGap: await this.mem0.checkHistoricalGap(query)
    };

    // 综合判断
    const shouldTrigger = 
      baseConditions.lowMatch || 
      baseConditions.newDomain ||
      mem0Conditions.frequentQuery ||
      mem0Conditions.userInterest;

    if (shouldTrigger) {
      await this.mem0.storeEvent({
        type: 'evolution_triggered',
        query: query,
        matchRate: matchRate,
        conditions: { ...baseConditions, ...mem0Conditions },
        timestamp: new Date().toISOString()
      });
    }

    return shouldTrigger;
  }
}
```

---

## 📁 配置文件

### 1. EvoIndex 2.0 配置

**文件**: `EvoIndex-2.0/config/mem0_integration.json`

```json
{
  "mem0": {
    "enabled": true,
    "api_key_env": "MEMOS_API_KEY",
    "base_url": "https://memos.memtensor.cn/api/openmem/v1",
    "user_id": "ou_94670ed1bd8c48afe8775cd995441ab1",
    "features": {
      "query_history": true,
      "user_preferences": true,
      "domain_interest": true,
      "event_tracking": true
    },
    "weights": {
      "personal_context": 0.4,
      "knowledge_retrieval": 0.6
    }
  },
  "evoindex": {
    "version": "2.0",
    "dictionary_path": "data/optimized_dictionary.json",
    "intent_mapping_path": "config/intent_term_map.json",
    "recall_threshold": 0.92,
    "match_threshold": 0.8
  }
}
```

---

### 2. 环境变量

**文件**: `EvoIndex-2.0/.env.example`

```bash
# MEM0 Configuration
MEMOS_API_KEY=mpg-e8w55RiU92S2BEJglK5nYJasUD6rx4yHyxpcvVeo
MEMOS_BASE_URL=https://memos.memtensor.cn/api/openmem/v1
MEMOS_USER_ID=ou_94670ed1bd8c48afe8775cd995441ab1

# EvoIndex Configuration
EVOINDEX_VERSION=2.0
EVOINDEX_RECALL_THRESHOLD=0.92
EVOINDEX_MATCH_THRESHOLD=0.8

# Tavily API (for self-evolution)
TAVILY_API_KEY=tvly-your-api-key
```

---

## 🔄 数据流

### 查询流程

```
用户查询
  ↓
1. 意图识别
  ├─ 历史回忆？ → MEM0 检索历史 → 返回结果
  └─ 知识查询？ → 继续
  ↓
2. MEM0 获取上下文
  ├─ 用户偏好领域
  ├─ 历史查询记录
  └─ 兴趣领域权重
  ↓
3. EvoIndex 检索
  ├─ 术语匹配（优先偏好领域）
  ├─ 倒排索引查询
  └─ 召回率验证
  ↓
4. 结果融合
  ├─ 个人上下文 40%
  └─ 专业知识 60%
  ↓
5. 返回结果
  ↓
6. MEM0 存储
  ├─ 查询历史
  └─ 更新兴趣领域
```

---

### 自进化流程

```
低匹配度查询
  ↓
1. 触发条件检测
  ├─ 匹配度 < 80%？
  ├─ 新领域？
  ├─ MEM0: 频繁查询？
  └─ MEM0: 用户兴趣？
  ↓
2. 触发学习
  ├─ Tavily 搜索文献
  ├─ 术语提取
  └─ 规则评估
  ↓
3. MEM0 记录
  ├─ 学习事件
  ├─ 新术语列表
  └─ 召回率提升
  ↓
4. 更新词典
  ↓
5. 召回率验证
  └─ < 92%？→ 回滚
  ↓
6. MEM0 存储结果
```

---

## 📊 效果预估

### 场景对比

| 场景 | 当前 (v1.0) | 集成后 (v2.0+MEM0) | 提升 |
|------|-----------|-------------------|------|
| **历史回忆查询** | ❌ 不支持 | ✅ 精准回忆 | 新增 |
| **偏好领域检索** | ⚠️ 平等对待 | ✅ 优先检索 | +50% |
| **新领域学习** | ⚠️ 被动触发 | ✅ 主动预测 | +30% |
| **个性化结果** | ❌ 通用结果 | ✅ 个人化 + 专业化 | 新增 |

### 性能指标

| 指标 | v1.0 | v2.0+MEM0 目标 |
|------|------|---------------|
| 查询响应时间 | <10ms | <15ms |
| 历史回忆准确率 | N/A | 90%+ |
| 偏好领域召回率 | 85% | 95%+ |
| 用户满意度 | - | 90%+ |

---

## 📅 开发计划

### Phase 1: MEM0 客户端（3-5 天）

**任务**:
- [ ] 安装 mem0-client 依赖
- [ ] 实现 Mem0Service 类
- [ ] 测试 API 连接
- [ ] 编写单元测试

**输出**:
- `src/utils/mem0_client.mjs`
- `test/mem0_client_test.mjs`

---

### Phase 2: 集成核心（5-7 天）

**任务**:
- [ ] 实现 EvoIndexMem0Integration
- [ ] 意图识别增强
- [ ] 结果融合逻辑
- [ ] 配置管理

**输出**:
- `src/core/mem0_integration.mjs`
- `config/mem0_integration.json`

---

### Phase 3: 自进化增强（3-5 天）

**任务**:
- [ ] EvolutionTriggerWithMem0
- [ ] 事件追踪
- [ ] 频繁查询检测
- [ ] 用户兴趣分析

**输出**:
- `src/core/evolution_trigger_mem0.mjs`

---

### Phase 4: 测试与优化（5-7 天）

**任务**:
- [ ] 端到端测试
- [ ] 性能测试
- [ ] 用户场景测试
- [ ] 编写测试报告

**输出**:
- `test/e2e_mem0_test.mjs`
- `docs/MEM0_INTEGRATION_REPORT.md`

---

## 🔒 安全与隐私

### 数据保护

| 数据类型 | 存储位置 | 加密 | 访问控制 |
|---------|---------|------|---------|
| MEM0 API Key | .env 文件 | ✅ 环境变量 | ✅ 仅本机 |
| 用户查询历史 | MEM0 云端 | ✅ TLS 传输 | ✅ API Key |
| 术语词典 | 本地 JSON | ❌ 明文 | ✅ 本地文件权限 |
| 检索日志 | 本地 JSON | ❌ 明文 | ✅ 本地文件权限 |

### 隐私保护

- ✅ 用户查询仅存储必要元数据
- ✅ 不存储敏感个人信息
- ✅ MEM0 API 调用使用 HTTPS
- ✅ 本地数据定期清理（可配置）

---

## 🎯 成功指标

### 功能完整性

- [ ] MEM0 查询历史检索正常
- [ ] 用户偏好识别准确
- [ ] 领域兴趣动态更新
- [ ] 自进化触发准确

### 性能指标

- [ ] 查询响应 < 15ms
- [ ] 历史回忆准确率 > 90%
- [ ] 偏好领域召回率 > 95%
- [ ] 用户满意度 > 90%

### 用户体验

- [ ] 历史回忆自然流畅
- [ ] 个性化结果明显
- [ ] 主动学习准确
- [ ] 无隐私泄露风险

---

## 📝 变更记录

| 日期 | 版本 | 变更 | 负责人 |
|------|------|------|--------|
| 2026-03-15 | v1.0 | 初始设计 | 耗电马喽 |

---

*最后更新：2026-03-15 12:51*  
*版本：v1.0 - 初始设计*
