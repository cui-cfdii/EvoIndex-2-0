/**
 * EvoIndex 2.0 意图分类器
 * 
 * 功能：识别用户查询的真实意图
 * 版本：v1.0
 * 创建时间：2026-03-15
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 意图类型枚举
 */
export const IntentType = {
  KNOWLEDGE_QUERY: 'knowledge_query',     // 知识查询
  HISTORY_RECALL: 'history_recall',        // 历史回忆
  TERM_EXPLANATION: 'term_explanation',    // 术语解释
  DOMAIN_EXPLORATION: 'domain_exploration',  // 领域探索
};

/**
 * 领域枚举
 */
export const Domain = {
  MEDICAL_AI: 'medical_ai',
  LEGAL_TECH: 'legal_tech',
  FINTECH: 'fintech',
  LLM: 'llm',
  AI_GENERAL: 'ai_general'
};

/**
 * 意图分类器配置
 */
export class IntentClassifierConfig {
  constructor(options = {}) {
    // 历史回忆关键词
    this.historyKeywords = options.historyKeywords || [
      '上次', '之前', '曾经', '上次查', '上次问', '我记得', '我之前问过'
    ];
    
    // 术语解释关键词
    this.explanationKeywords = options.explanationKeywords || [
      '什么是', '什么意思', '解释', '定义', '含义', '是什么意思', '咋理解'
    ];
    
    // 领域探索关键词
    this.explorationKeywords = options.explorationKeywords || [
      '介绍一下', '讲讲', '说说', '了解', '想了解', '想知道'
    ];
    
    // 领域术语映射表路径
    this.domainTermMapPath = options.domainTermMapPath || 
      join(__dirname, '../utils/intent_term_map.json');
    
    // 加载领域术语映射表
    this.domainTermMap = this.loadDomainTermMap();
  }
  
  /**
   * 加载领域术语映射表
   */
  loadDomainTermMap() {
    try {
      const content = readFileSync(this.domainTermMapPath, 'utf-8');
      return JSON.parse(content).domain_term_map;
    } catch (error) {
      console.warn('⚠️ 无法加载领域术语映射表，使用默认配置');
      return this.getDefaultDomainTermMap();
    }
  }
  
  /**
   * 默认领域术语映射表
   */
  getDefaultDomainTermMap() {
    return {
      [Domain.MEDICAL_AI]: [
        '肺结节', '肺结核', '肺癌', '肺炎', '诊断', '影像', 'CT', 'MRI',
        '治疗', '方案', '药物', '临床', 'AI', '人工智能', '辅助诊断'
      ],
      [Domain.LEGAL_TECH]: [
        '合同', '法规', '律师', '诉讼', '法律', '司法', '案件', '审判',
        '合规', '审查', '条款', '协议'
      ],
      [Domain.FINTECH]: [
        '投资', '理财', '风控', '信贷', '金融', '银行', '保险', '证券',
        '量化', '交易', '基金', '股票'
      ],
      [Domain.LLM]: [
        '大模型', '微调', '提示词', 'LLM', 'RAG', '检索', '生成', '嵌入',
        'Transformer', '注意力', '训练'
      ],
      [Domain.AI_GENERAL]: [
        '机器学习', '深度学习', '神经网络', 'CV', '计算机视觉',
        'NLP', '自然语言处理', '强化学习', '算法', '模型'
      ]
    };
  }
}

/**
 * 意图结果
 */
export class IntentResult {
  constructor(options = {}) {
    this.type = options.type || IntentType.KNOWLEDGE_QUERY;
    this.confidence = options.confidence || 0.8;
    this.entities = options.entities || [];
    this.domain = options.domain || Domain.AI_GENERAL;
    this.metadata = options.metadata || { trigger: 'default' };
    this.timestamp = new Date().toISOString();
  }
  
  toJSON() {
    return {
      type: this.type,
      confidence: this.confidence,
      entities: this.entities,
      domain: this.domain,
      metadata: this.metadata,
      timestamp: this.timestamp
    };
  }
}

/**
 * 意图分类器
 */
export class IntentClassifier {
  constructor(config = new IntentClassifierConfig()) {
    this.config = config;
  }
  
  /**
   * 分类查询意图
   * @param {string} query - 用户查询
   * @returns {Promise<IntentResult>}
   */
  async classify(query) {
    // 1. 检测历史回忆
    if (this.isHistoryRecall(query)) {
      return new IntentResult({
        type: IntentType.HISTORY_RECALL,
        confidence: 0.95,
        entities: this.extractEntities(query),
        metadata: { trigger: 'history_keyword' }
      });
    }
    
    // 2. 检测术语解释
    if (this.isTermExplanation(query)) {
      return new IntentResult({
        type: IntentType.TERM_EXPLANATION,
        confidence: 0.9,
        entities: this.extractEntities(query),
        domain: this.detectDomain(query),
        metadata: { trigger: 'explanation_keyword' }
      });
    }
    
    // 3. 检测领域探索
    if (this.isDomainExploration(query)) {
      return new IntentResult({
        type: IntentType.DOMAIN_EXPLORATION,
        confidence: 0.85,
        entities: this.extractEntities(query),
        domain: this.detectDomain(query),
        metadata: { trigger: 'exploration_keyword' }
      });
    }
    
    // 4. 默认：知识查询
    const domain = this.detectDomain(query);
    return new IntentResult({
      type: IntentType.KNOWLEDGE_QUERY,
      confidence: 0.8,
      entities: this.extractEntities(query),
      domain: domain,
      metadata: { trigger: 'default' }
    });
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
    return Domain.AI_GENERAL;
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
    const stopWords = [
      '的', '了', '是', '在', '我', '有', '和', '就', '不', '人',
      '都', '一', '一个', '吗', '呢', '吧', '啊', '呀', '哦'
    ];
    return stopWords.includes(word);
  }
}

/**
 * 主函数（测试用）
 */
async function main() {
  const classifier = new IntentClassifier();
  
  const testQueries = [
    '肺结核的治疗方案有哪些',
    '我上次查的肺结核治疗方案呢？',
    '什么是 RAG？',
    '介绍一下金融科技',
    '合同审查的最佳实践'
  ];
  
  console.log('🧪 EvoIndex 2.0 意图分类器测试\n');
  
  for (const query of testQueries) {
    const result = await classifier.classify(query);
    console.log(`查询："${query}"`);
    console.log(`意图：${result.type}`);
    console.log(`领域：${result.domain}`);
    console.log(`置信度：${(result.confidence * 100).toFixed(1)}%`);
    console.log(`实体：${result.entities.join(', ')}`);
    console.log('---\n');
  }
}

// 导出默认实例
export const intentClassifier = new IntentClassifier();

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
