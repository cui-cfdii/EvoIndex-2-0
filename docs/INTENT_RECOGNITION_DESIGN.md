# 意图识别模块设计

**版本**: v1.0  
**创建时间**: 2026-03-15 13:53  
**设计**: 中书省（agent-deep-research）

---

## 🎯 目标

实现 EvoIndex 2.0 的意图识别功能，理解用户查询的真实意图。

---

## 📊 意图分类体系

### 第一层：查询类型

| 类型 | 标识 | 说明 | 示例 |
|------|------|------|------|
| **知识查询** | `knowledge_query` | 查询专业知识 | "肺结核的治疗方案" |
| **历史回忆** | `history_recall` | 回忆历史查询 | "我上次查的 XXX 呢？" |
| **术语解释** | `term_explanation` | 询问术语含义 | "什么是 RAG？" |
| **领域探索** | `domain_exploration` | 探索新领域 | "介绍一下金融科技" |

### 第二层：领域分类

| 领域 | 标识 | 关键词 |
|------|------|--------|
| **医疗 AI** | `medical_ai` | 肺结节、诊断、影像、CT |
| **法律科技** | `legal_tech` | 合同、法规、律师、诉讼 |
| **金融科技** | `fintech` | 投资、理财、风控、信贷 |
| **LLM 技术** | `llm` | 大模型、微调、提示词 |
| **AI 通用** | `ai_general` | 机器学习、深度学习、CV |

### 第三层：文档类型偏好

| 类型 | 标识 | 说明 |
|------|------|------|
| **指南** | `guideline` | 临床指南、治疗指南 |
| **综述** | `review` | 技术综述、研究进展 |
| **教程** | `tutorial` | 使用教程、操作指南 |
| **API 文档** | `api_doc` | API 说明、接口文档 |
| **最佳实践** | `best_practice` | 实践经验、案例 |

---

## 🏗️ 技术实现

### 1. 意图分类器（规则版）

**文件**: `src/core/intent_classifier.mjs`

```javascript
export class IntentClassifier {
  constructor(config = {}) {
    this.config = {
      historyKeywords: ['上次', '之前', '曾经', '上次查', '上次问', '我记得'],
      explanationKeywords: ['什么是', '什么意思', '解释', '定义', '含义'],
      explorationKeywords: ['介绍一下', '讲讲', '说说', '了解'],
      domainTermMap: config.domainTermMap || {},
      ...config
    };
  }

  /**
   * 分类查询意图
   * @param {string} query - 用户查询
   * @returns {Promise<IntentResult>}
   */
  async classify(query) {
    // 1. 检测历史回忆
    if (this.isHistoryRecall(query)) {
      return {
        type: 'history_recall',
        confidence: 0.95,
        entities: this.extractEntities(query),
        metadata: {
          trigger: 'history_keyword'
        }
      };
    }

    // 2. 检测术语解释
    if (this.isTermExplanation(query)) {
      return {
        type: 'term_explanation',
        confidence: 0.9,
        entities: this.extractEntities(query),
        metadata: {
          trigger: 'explanation_keyword'
        }
      };
    }

    // 3. 检测领域探索
    if (this.isDomainExploration(query)) {
      return {
        type: 'domain_exploration',
        confidence: 0.85,
        entities: this.extractEntities(query),
        metadata: {
          trigger: 'exploration_keyword'
        }
      };
    }

    // 4. 默认：知识查询
    const domain = this.detectDomain(query);
    return {
      type: 'knowledge_query',
      confidence: 0.8,
      entities: this.extractEntities(query),
      domain: domain,
      metadata: {
        trigger: 'default'
      }
    };
  }

  /**
   * 检测是否是历史回忆
   */
  isHistoryRecall(query) {
    return this.config.historyKeywords.some(kw => query.includes(kw));
  }

  /**
   * 检测是否是术语解释
   */
  isTermExplanation(query) {
    const lowerQuery = query.toLowerCase();
    return this.config.explanationKeywords.some(kw => 
      lowerQuery.includes(kw) || lowerQuery.startsWith(kw)
    );
  }

  /**
   * 检测是否是领域探索
   */
  isDomainExploration(query) {
    return this.config.explorationKeywords.some(kw => query.includes(kw));
  }

  /**
   * 检测领域
   */
  detectDomain(query) {
    for (const [domain, terms] of Object.entries(this.config.domainTermMap)) {
      if (terms.some(term => query.includes(term))) {
        return domain;
      }
    }
    return 'ai_general';
  }

  /**
   * 提取实体
   */
  extractEntities(query) {
    // 简单实现：提取名词短语
    // TODO: 使用 NLP 模型优化
    const words = query.split(/[\s,，.。？?！!]+/);
    return words.filter(w => w.length > 1 && !this.isStopWord(w));
  }

  /**
   * 停用词检查
   */
  isStopWord(word) {
    const stopWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个'];
    return stopWords.includes(word);
  }
}

/**
 * 意图结果类型
 * @typedef {Object} IntentResult
 * @property {string} type - 意图类型
 * @property {number} confidence - 置信度
 * @property {string[]} entities - 提取的实体
 * @property {string} [domain] - 领域（知识查询时）
 * @property {Object} metadata - 元数据
 */
```

---

### 2. 意图 - 术语映射表

**文件**: `src/utils/intent_term_map.json`

```json
{
  "version": "1.0",
  "created_at": "2026-03-15T13:53:00+08:00",
  "domain_term_map": {
    "medical_ai": [
      "肺结节", "肺结核", "肺癌", "肺炎",
      "诊断", "影像", "CT", "MRI",
      "治疗", "方案", "药物", "临床",
      "AI", "人工智能", "辅助诊断"
    ],
    "legal_tech": [
      "合同", "法规", "律师", "诉讼",
      "法律", "司法", "案件", "审判",
      "合规", "审查", "条款", "协议"
    ],
    "fintech": [
      "投资", "理财", "风控", "信贷",
      "金融", "银行", "保险", "证券",
      "量化", "交易", "基金", "股票"
    ],
    "llm": [
      "大模型", "微调", "提示词", "LLM",
      "RAG", "检索", "生成", "嵌入",
      "Transformer", "注意力", "训练"
    ],
    "ai_general": [
      "机器学习", "深度学习", "神经网络",
      "CV", "计算机视觉", "NLP", "自然语言处理",
      "强化学习", "算法", "模型"
    ]
  },
  "intent_type_map": {
    "knowledge_query": {
      "keywords": [],
      "default": true
    },
    "history_recall": {
      "keywords": ["上次", "之前", "曾经", "上次查", "上次问", "我记得"]
    },
    "term_explanation": {
      "keywords": ["什么是", "什么意思", "解释", "定义", "含义"]
    },
    "domain_exploration": {
      "keywords": ["介绍一下", "讲讲", "说说", "了解"]
    }
  },
  "document_type_map": {
    "guideline": {
      "keywords": ["指南", "共识", "路径", "规范"],
      "domains": ["medical_ai", "legal_tech"]
    },
    "review": {
      "keywords": ["综述", "进展", "现状", "趋势"],
      "domains": ["ai_general", "llm", "fintech"]
    },
    "tutorial": {
      "keywords": ["教程", "教学", "入门", "指南"],
      "domains": ["llm", "ai_general"]
    },
    "api_doc": {
      "keywords": ["API", "接口", "文档", "调用"],
      "domains": ["llm", "ai_general"]
    },
    "best_practice": {
      "keywords": ["最佳实践", "经验", "案例", "实战"],
      "domains": ["all"]
    }
  }
}
```

---

### 3. 文档类型推断

**文件**: `src/core/document_type_inference.mjs`

```javascript
export class DocumentTypeInference {
  constructor(intentTermMap) {
    this.intentTermMap = intentTermMap;
  }

  /**
   * 推断用户偏好的文档类型
   * @param {IntentResult} intent - 意图结果
   * @returns {string[]} 文档类型列表（按优先级排序）
   */
  infer(intent) {
    const { type, domain, entities } = intent;

    // 1. 根据意图类型推断
    if (type === 'term_explanation') {
      return ['tutorial', 'api_doc'];
    }

    if (type === 'domain_exploration') {
      return ['review', 'best_practice'];
    }

    // 2. 根据领域推断
    if (domain === 'medical_ai') {
      return ['guideline', 'review', 'best_practice'];
    }

    if (domain === 'legal_tech') {
      return ['guideline', 'best_practice'];
    }

    if (domain === 'llm') {
      return ['tutorial', 'api_doc', 'review'];
    }

    // 3. 根据实体关键词推断
    for (const [docType, config] of Object.entries(this.intentTermMap.document_type_map)) {
      if (config.keywords.some(kw => 
        entities.some(entity => entity.includes(kw))
      )) {
        return [docType];
      }
    }

    // 4. 默认
    return ['review', 'best_practice'];
  }
}
```

---

## 📝 使用示例

### 示例 1：知识查询

```javascript
const classifier = new IntentClassifier(intentTermMap);
const result = await classifier.classify('肺结核的治疗方案有哪些');

// 结果:
{
  type: 'knowledge_query',
  confidence: 0.8,
  entities: ['肺结核', '治疗', '方案'],
  domain: 'medical_ai',
  metadata: { trigger: 'default' }
}
```

### 示例 2：历史回忆

```javascript
const result = await classifier.classify('我上次查的肺结核治疗方案呢？');

// 结果:
{
  type: 'history_recall',
  confidence: 0.95,
  entities: ['上次', '肺结核', '治疗', '方案'],
  metadata: { trigger: 'history_keyword' }
}
```

### 示例 3：术语解释

```javascript
const result = await classifier.classify('什么是 RAG？');

// 结果:
{
  type: 'term_explanation',
  confidence: 0.9,
  entities: ['RAG'],
  domain: 'llm',
  metadata: { trigger: 'explanation_keyword' }
}
```

---

## 🧪 测试用例

**文件**: `test/intent_classifier_test.mjs`

```javascript
import { IntentClassifier } from '../src/core/intent_classifier.mjs';
import intentTermMap from '../src/utils/intent_term_map.json' assert { type: 'json' };

const classifier = new IntentClassifier(intentTermMap);

const testCases = [
  {
    query: '肺结核的治疗方案有哪些',
    expected: { type: 'knowledge_query', domain: 'medical_ai' }
  },
  {
    query: '我上次查的肺结核治疗方案呢？',
    expected: { type: 'history_recall' }
  },
  {
    query: '什么是 RAG？',
    expected: { type: 'term_explanation', domain: 'llm' }
  },
  {
    query: '介绍一下金融科技',
    expected: { type: 'domain_exploration', domain: 'fintech' }
  },
  {
    query: '合同审查的最佳实践',
    expected: { type: 'knowledge_query', domain: 'legal_tech' }
  }
];

let passed = 0;
for (const testCase of testCases) {
  const result = await classifier.classify(testCase.query);
  const pass = result.type === testCase.expected.type && 
               (!testCase.expected.domain || result.domain === testCase.expected.domain);
  
  if (pass) {
    console.log(`✅ "${testCase.query}"`);
    passed++;
  } else {
    console.log(`❌ "${testCase.query}"`);
    console.log(`   期望：${JSON.stringify(testCase.expected)}`);
    console.log(`   实际：${JSON.stringify(result)}`);
  }
}

console.log(`\n通过率：${passed}/${testCases.length} (${(passed/testCases.length*100).toFixed(1)}%)`);
```

---

## 📅 开发进度

| 任务 | 状态 | 预计耗时 |
|------|------|---------|
| 意图分类器实现 | ⏳ 待开始 | 2 小时 |
| 意图 - 术语映射表 | ⏳ 待开始 | 1 小时 |
| 文档类型推断 | ⏳ 待开始 | 1 小时 |
| 测试用例编写 | ⏳ 待开始 | 1 小时 |
| **总计** | - | **5 小时** |

---

*最后更新：2026-03-15 13:53*  
*版本：v1.0 - 初始设计*
