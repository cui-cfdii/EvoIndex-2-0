/**
 * 混合评估器 (规则 + LLM)
 * 
 * 优势:
 * - 规则评估：稳定可靠，快速
 * - LLM 评估：语义理解，灵活
 * - 自动 fallback：LLM 失败时用规则
 */

import { LLMClient, getLLMClient } from '../utils/llm_client.mjs';

export class HybridEvaluator {
  constructor(config = {}) {
    this.llm = getLLMClient({
      baseURL: config.baseURL || 'http://127.0.0.1:5000',
      model: config.model || 'qwen3.5-35b-a3b',
    });
    
    // 评估权重
    this.ruleWeight = config.ruleWeight || 0.7; // 规则评估权重 70%
    this.llmWeight = config.llmWeight || 0.3;   // LLM 评估权重 30%
    
    // 专业术语词典
    this.aiTerms = new Set([
      '人工智能', 'AI', '大模型', 'LLM', '深度学习', '机器学习',
      '神经网络', '自然语言处理', 'NLP', '计算机视觉', 'CV',
      '图像识别', '目标检测', '开源', '部署', '微调', 'fine-tuning',
      'LoRA', '智慧城市', '智能城市', '城市大脑', '发展历程',
      '演进', '里程碑', '应用场景', '落地', '案例', '检索',
      '召回率', '准确率', 'RAG', '索引', '查询', '检索引擎',
      'Qwen', '通义千问', '百度', '阿里', '腾讯', 'LM Studio',
      'Ollama', 'vLLM', 'ModelScope'
    ]);
    
    // 停用词
    this.stopWords = new Set(['的', '了', '是', '在', '和', '与', '及', '等']);
    
    // 缓存
    this.cache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    
    console.log('✅ 混合评估器初始化完成');
    console.log(`   规则权重：${this.ruleWeight * 100}%`);
    console.log(`   LLM 权重：${this.llmWeight * 100}%`);
    console.log(`   术语词典：${this.aiTerms.size} 个`);
  }

  /**
   * 评估分词质量
   */
  async evaluate(text, tokens) {
    const cacheKey = `${text}|${tokens.join('/')}`;
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      this.cacheHits++;
      return this.cache.get(cacheKey);
    }
    
    this.cacheMisses++;
    
    // 1. 规则评估（70% 权重）
    const ruleScore = this._ruleBasedEvaluate(text, tokens);
    
    // 2. LLM 评估（30% 权重，带 fallback）
    let llmScore = ruleScore; // 默认使用规则分数
    try {
      llmScore = await this._llmEvaluate(text, tokens);
    } catch (error) {
      console.log(`⚠️  LLM 评估失败，使用规则评估：${error.message}`);
    }
    
    // 3. 混合评分
    const finalScore = this.ruleWeight * ruleScore + this.llmWeight * llmScore;
    
    const result = {
      score: finalScore,
      maxScore: 30,
      normalizedScore: finalScore / 30,
      ruleScore,
      llmScore,
      issues: [],
      suggestions: tokens,
    };
    
    // 缓存
    if (this.cache.size >= 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, result);
    
    return result;
  }

  /**
   * 基于规则的评估（同步）
   */
  _ruleBasedEvaluate(text, tokens) {
    let score = 15; // 基础分
    
    // 规则 1: 专业术语识别（+5 分）
    const hasAITerm = tokens.some(t => this.aiTerms.has(t));
    if (hasAITerm) score += 5;
    
    // 规则 2: 分词粒度合理（+5 分）
    const avgLength = tokens.reduce((sum, t) => sum + t.length, 0) / tokens.length;
    if (avgLength >= 2 && avgLength <= 4) score += 5;
    
    // 规则 3: 无单字分词（+5 分）
    const hasSingleChar = tokens.some(t => 
      t.length === 1 && !this.stopWords.has(t)
    );
    if (!hasSingleChar) score += 5;
    
    return Math.min(30, score);
  }

  /**
   * 基于规则的评估（公开方法）
   */
  ruleBasedEvaluate(text, tokens) {
    return this._ruleBasedEvaluate(text, tokens);
  }

  /**
   * LLM 评估
   */
  async _llmEvaluate(text, tokens) {
    const prompt = `请严格评估以下中文分词质量，只输出 JSON，不要任何其他内容：

原文：${text}
分词结果：${tokens.join(' / ')}

评分标准：
1. 语义完整性 (0-10 分)
2. 专业术语识别 (0-10 分)
3. 粒度合理性 (0-10 分)

输出格式（必须严格遵循）：
{"score":数字}`;

    const response = await this.llm.chat(prompt, {
      maxTokens: 200,
      temperature: 0.1,
    });

    // 提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('LLM 未返回 JSON 格式');
    }

    const result = JSON.parse(jsonMatch[0]);
    const score = typeof result.score === 'number' ? result.score : 15;
    
    return Math.max(0, Math.min(30, score));
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const total = this.cacheHits + this.cacheMisses;
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRate: total > 0 ? (this.cacheHits / total * 100).toFixed(1) : 0,
      cacheSize: this.cache.size,
      ruleWeight: this.ruleWeight,
      llmWeight: this.llmWeight,
    };
  }
}
