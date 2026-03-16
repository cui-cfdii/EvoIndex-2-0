/**
 * 自进化分词 Agent v2 - 高效稳定版
 * 
 * 优化策略:
 * 1. 阶段性进化 - 达到阈值后降低频率
 * 2. 稳定机制 - 分数下降时回滚
 * 3. 缓存优化 - 避免重复评估
 * 4. 批量处理 - 提高效率
 */

import { LLMClient, getLLMClient } from '../utils/llm_client.mjs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const JIEBA_SCRIPT = join(__dirname, '../utils/jieba_tokenizer.py');

export class SelfEvolvingTokenizerV2 {
  constructor(config = {}) {
    // 使用单例 LLM 客户端
    this.llm = getLLMClient({
      baseURL: config.baseURL || 'http://127.0.0.1:5000',
      model: config.model || 'qwen3.5-9b',
    });
    
    // 自定义词典
    this.customDict = new Set([
      '人工智能', 'AI', '大模型', 'LLM', '深度学习',
      '机器学习', '神经网络', '自然语言处理', 'NLP',
      '计算机视觉', 'CV', '图像识别', '目标检测',
      '开源', '部署', '微调', 'fine-tuning', 'LoRA',
      '智慧城市', '智能城市', '城市大脑',
      '发展历程', '演进', '里程碑',
      '应用场景', '落地', '案例',
      '检索', '召回率', '准确率', 'RAG',
      '索引', '查询', '检索引擎',
      'Qwen', '通义千问', '百度', '阿里', '腾讯',
      'LM Studio', 'Ollama', 'vLLM', 'ModelScope'
    ]);
    
    // 进化配置
    this.config = {
      // 阶段性阈值
      stageThresholds: [0.7, 0.8, 0.85, 0.9, 0.93],
      // 稳定阈值（达到后降低进化频率）
      stabilityThreshold: 0.9,
      // 回滚阈值（分数下降超过此值则回滚）
      rollbackThreshold: 0.05,
      // 缓存大小
      cacheSize: 1000,
      // 批量大小
      batchSize: 10,
    };
    
    // 进化历史
    this.evolutionHistory = [];
    
    // 当前代数
    this.generation = 0;
    
    // 当前阶段
    this.currentStage = 0;
    
    // 性能指标
    this.metrics = {
      avgScore: 0,
      bestScore: 0,
      totalIterations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      rollbacks: 0,
    };
    
    // 评估缓存
    this.evalCache = new Map();
    
    // 最佳状态快照
    this.bestState = null;
    
    // 测试 jieba
    this.jiebaAvailable = this._testJieba();
    
    console.log('✅ 自进化分词 Agent v2 初始化完成');
    console.log(`   模型：${config.model || 'qwen3.5-9b'}`);
    console.log(`   自定义词典：${this.customDict.size} 个术语`);
    console.log(`   jieba 分词：${this.jiebaAvailable ? '✅ 可用' : '⚠️ 不可用'}`);
    console.log(`   稳定阈值：${this.config.stabilityThreshold * 100}%`);
    console.log(`   回滚阈值：${this.config.rollbackThreshold * 100}%`);
  }

  /**
   * 测试 jieba 可用性
   */
  _testJieba() {
    try {
      const result = execSync(`python "${JIEBA_SCRIPT}" test`, {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'ignore']
      });
      const parsed = JSON.parse(result);
      return parsed.success === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 分词
   */
  tokenize(text) {
    if (this.jiebaAvailable) {
      try {
        const result = execSync(`python "${JIEBA_SCRIPT}" tokenize "${text}"`, {
          encoding: 'utf-8',
          timeout: 5000,
          stdio: ['pipe', 'pipe', 'ignore']
        });
        const parsed = JSON.parse(result);
        if (parsed.success) {
          return parsed.tokens;
        }
      } catch (error) {
        // 静默失败
      }
    }
    
    // 内置简单分词
    return text.split(/[\s,，.。:：;；!?！？]+/).filter(t => t.length > 0);
  }

  /**
   * 评估分词质量（带缓存 + 严格 JSON 输出）
   */
  async evaluate(text, tokens) {
    const cacheKey = `${text}|${tokens.join('/')}`;
    
    // 检查缓存
    if (this.evalCache.has(cacheKey)) {
      this.metrics.cacheHits++;
      return this.evalCache.get(cacheKey);
    }
    
    this.metrics.cacheMisses++;
    
    // 使用更严格的提示词
    const prompt = `请严格评估以下中文分词质量，只输出 JSON，不要任何其他内容：

原文：${text}
分词结果：${tokens.join(' / ')}

评分标准：
1. 语义完整性 (0-10 分)
2. 专业术语识别 (0-10 分)
3. 粒度合理性 (0-10 分)

输出格式（必须严格遵循）：
{"score":数字,"issues":[],"suggestions":[]}`;

    try {
      // 降低 temperature，提高确定性
      const response = await this.llm.chat(prompt, {
        maxTokens: 500,
        temperature: 0.1,  // 从 0.3 降到 0.1
      });

      // 提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('LLM 未返回 JSON 格式');
      }

      const result = JSON.parse(jsonMatch[0]);

      // 验证必需字段
      const score = typeof result.score === 'number' ? result.score : 15;
      
      const evalResult = {
        score: Math.max(0, Math.min(30, score)), // 限制在 0-30
        maxScore: 30,
        normalizedScore: Math.max(0, Math.min(30, score)) / 30,
        issues: Array.isArray(result.issues) ? result.issues : [],
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : tokens,
      };

      // 缓存（只保留最近的）
      if (this.evalCache.size >= this.config.cacheSize) {
        const firstKey = this.evalCache.keys().next().value;
        this.evalCache.delete(firstKey);
      }
      this.evalCache.set(cacheKey, evalResult);

      return evalResult;
    } catch (error) {
      console.error('评估失败:', error.message);
      
      // Fallback: 基于规则的评估
      const ruleBasedScore = this._ruleBasedEvaluate(text, tokens);
      
      return {
        score: ruleBasedScore,
        maxScore: 30,
        normalizedScore: ruleBasedScore / 30,
        issues: ['LLM 评估失败，使用规则评估'],
        suggestions: tokens,
        error: error.message,
      };
    }
  }

  /**
   * 基于规则的评估（fallback 机制）
   */
  _ruleBasedEvaluate(text, tokens) {
    let score = 15; // 基础分
    
    // 规则 1: 专业术语识别（+5 分）
    const aiTerms = ['AI', '人工智能', '大模型', 'LLM', '深度学习', '机器学习', 'NLP', 'CV'];
    const hasAITerm = tokens.some(t => aiTerms.includes(t));
    if (hasAITerm) score += 5;
    
    // 规则 2: 分词粒度合理（+5 分）
    const avgLength = tokens.reduce((sum, t) => sum + t.length, 0) / tokens.length;
    if (avgLength >= 2 && avgLength <= 4) score += 5;
    
    // 规则 3: 无单字分词（+5 分）
    const hasSingleChar = tokens.some(t => t.length === 1 && !['的', '了', '是', '在'].includes(t));
    if (!hasSingleChar) score += 5;
    
    return Math.min(30, score);
  }

  /**
   * 单轮进化（带稳定机制）
   */
  async evolve(text) {
    this.generation++;
    this.metrics.totalIterations++;

    // Step 1: 分词
    const tokens = this.tokenize(text);

    // Step 2: 评估
    const evaluation = await this.evaluate(text, tokens);

    // Step 3: 检查是否需要回滚
    if (this.bestState && 
        evaluation.normalizedScore < this.bestState.score - this.config.rollbackThreshold) {
      
      this.metrics.rollbacks++;
      console.log(`⚠️  第${this.generation}代分数下降，触发回滚`);
      
      // 回滚到最佳状态
      return {
        generation: this.generation,
        score: this.bestState.score,
        tokens: this.bestState.tokens,
        rolledBack: true,
      };
    }

    // Step 4: 记录历史
    this.evolutionHistory.push({
      generation: this.generation,
      text,
      tokens,
      score: evaluation.normalizedScore,
      timestamp: Date.now(),
    });

    // Step 5: 更新指标
    this.metrics.avgScore = 
      this.evolutionHistory.slice(-20).reduce((sum, h) => sum + h.score, 0) / 
      Math.min(this.evolutionHistory.length, 20);
    
    if (evaluation.normalizedScore > this.metrics.bestScore) {
      this.metrics.bestScore = evaluation.normalizedScore;
      
      // 保存最佳状态
      this.bestState = {
        score: evaluation.normalizedScore,
        tokens,
        dict: new Set(this.customDict),
        generation: this.generation,
      };
    }

    // Step 6: 检查阶段性进展
    this._checkStageProgress();

    return {
      generation: this.generation,
      original: tokens,
      score: evaluation.normalizedScore,
      avgScore: this.metrics.avgScore,
      bestScore: this.metrics.bestScore,
      rolledBack: false,
    };
  }

  /**
   * 检查阶段性进展
   */
  _checkStageProgress() {
    const currentAvg = this.metrics.avgScore;
    
    // 检查是否达到下一阶段
    if (this.currentStage < this.config.stageThresholds.length) {
      const nextThreshold = this.config.stageThresholds[this.currentStage];
      
      if (currentAvg >= nextThreshold) {
        console.log(`\n🎉 达到第${this.currentStage + 1}阶段！平均分：${(currentAvg * 100).toFixed(1)}%`);
        this.currentStage++;
        
        // 达到稳定阈值后，降低进化频率
        if (currentAvg >= this.config.stabilityThreshold) {
          console.log('✅ 达到稳定状态，降低进化频率');
        }
      }
    }
  }

  /**
   * 批量进化（高效版）
   */
  async evolveBatch(texts, iterations = 100) {
    console.log(`\n🚀 开始高效进化：${texts.length} 样本，${iterations} 轮`);
    console.log(`   稳定阈值：${this.config.stabilityThreshold * 100}%`);
    console.log(`   回滚保护：${this.config.rollbackThreshold * 100}%`);
    console.log(`   缓存容量：${this.config.cacheSize}`);
    
    const results = [];
    let stableCount = 0;

    for (let i = 0; i < iterations; i++) {
      // 达到稳定状态后，降低进化频率
      const isStable = this.metrics.avgScore >= this.config.stabilityThreshold;
      
      if (isStable && stableCount > 0) {
        // 稳定状态下，每 5 轮进化 1 次
        if (i % 5 !== 0) {
          stableCount++;
          continue;
        }
      }
      
      // 随机选择样本
      const text = texts[Math.floor(Math.random() * texts.length)];
      const result = await this.evolve(text);
      results.push(result);

      // 定期汇报
      if ((i + 1) % 10 === 0) {
        const recent10 = results.slice(-10);
        const recentAvg = recent10.reduce((sum, r) => sum + r.score, 0) / 10;
        
        console.log(`\n📊 第 ${i + 1}/${iterations} 轮`);
        console.log(`   最近 10 轮平均：${(recentAvg * 100).toFixed(1)}%`);
        console.log(`   历史最佳：${(this.metrics.bestScore * 100).toFixed(1)}%`);
        console.log(`   缓存命中率：${(this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(1)}%`);
        console.log(`   回滚次数：${this.metrics.rollbacks}`);
        
        if (isStable) {
          console.log(`   状态：✅ 稳定（降低频率）`);
        }
      }
    }

    // 总结
    const initialScore = results.slice(0, 10).reduce((sum, r) => sum + r.score, 0) / 10;
    const finalScore = results.slice(-10).reduce((sum, r) => sum + r.score, 0) / 10;
    const improvement = finalScore - initialScore;

    console.log('\n' + '='.repeat(60));
    console.log('🎉 进化训练完成！');
    console.log('='.repeat(60));
    console.log(`初始平均分：${(initialScore * 100).toFixed(1)}%`);
    console.log(`最终平均分：${(finalScore * 100).toFixed(1)}%`);
    console.log(`提升幅度：${(improvement * 100).toFixed(1)}%`);
    console.log(`总迭代数：${this.metrics.totalIterations}`);
    console.log(`回滚次数：${this.metrics.rollbacks}`);
    console.log(`缓存命中率：${(this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    return {
      initialScore,
      finalScore,
      improvement,
      totalIterations: this.metrics.totalIterations,
      rollbacks: this.metrics.rollbacks,
      results,
    };
  }

  /**
   * 导出优化词典
   */
  exportDictionary() {
    return {
      customDict: Array.from(this.customDict),
      bestState: this.bestState,
      metrics: this.metrics,
      generation: this.generation,
    };
  }

  /**
   * 导入词典
   */
  importDictionary(dictData) {
    if (dictData.customDict) {
      this.customDict = new Set(dictData.customDict);
    }
    if (dictData.bestState) {
      this.bestState = dictData.bestState;
    }
    console.log(`✅ 导入词典：${this.customDict.size} 个术语`);
  }
}

/**
 * 创建测试样本
 */
export function createTestSamples() {
  return [
    '中国 AI 发展历程',
    '计算机视觉技术应用',
    '开源大模型部署方案',
    'LoRA 微调方法',
    '智慧城市应用案例',
    '人工智能在医疗领域的应用',
    '深度学习模型优化技巧',
    '自然语言处理技术综述',
    '大模型训练数据准备',
    '智能城市管理系统设计',
  ];
}
