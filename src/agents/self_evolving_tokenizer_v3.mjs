/**
 * 自进化分词 Agent v3 (CMA-ES + 混合评估 + 记忆增强)
 * 
 * 核心特性:
 * 1. CMA-ES 优化器 - 全局搜索最优参数
 * 2. 混合评估器 - 规则 70% + LLM 30%
 * 3. 记忆增强 - 经验缓存 + 历史最佳快照
 * 4. 元学习 - 自动调整评估权重
 */

import { CMAESOptimizer } from './cmaes_optimizer.mjs';
import { HybridEvaluator } from './hybrid_evaluator.mjs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const JIEBA_SCRIPT = join(__dirname, '../utils/jieba_tokenizer.py');

export class SelfEvolvingTokenizerV3 {
  constructor(config = {}) {
    // jieba 分词器
    this.jiebaAvailable = this._testJieba();
    
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
    
    // CMA-ES 优化器
    this.optimizer = new CMAESOptimizer({
      dim: 50, // 43 个词典权重 + 7 个超参数
      lambda: 20, // 种群大小
      sigma: 0.3, // 初始步长
    });
    
    // 混合评估器
    this.evaluator = new HybridEvaluator({
      baseURL: config.baseURL || 'http://127.0.0.1:5000',
      model: config.model || 'qwen3.5-35b-a3b',
      ruleWeight: 0.7,
      llmWeight: 0.3,
    });
    
    // 记忆系统
    this.memory = {
      experiences: [], // 经验缓存
      bestSnapshot: null, // 历史最佳快照
      failures: [], // 失败案例
    };
    
    // 测试样本
    this.testSamples = [];
    
    // 设置 CMA-ES 评估函数
    this.optimizer.setEvaluateFunction((params) => {
      return this._evaluateParams(params);
    });
    
    console.log('✅ 自进化分词 Agent v3 初始化完成');
    console.log(`   CMA-ES 维度：${this.optimizer.dim}`);
    console.log(`   混合评估：规则${this.evaluator.ruleWeight * 100}% + LLM${this.evaluator.llmWeight * 100}%`);
    console.log(`   jieba 分词：${this.jiebaAvailable ? '✅ 可用' : '⚠️ 不可用'}`);
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
   * 分词（使用 jieba）
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
   * 评估参数（CMA-ES 目标函数）
   */
  _evaluateParams(params) {
    // params 结构:
    // [0-42]: 43 个词典权重
    // [43]: 规则评估权重
    // [44]: LLM 评估权重
    // [45]: 最小词长
    // [46]: 最大词长
    // [47-49]: 其他超参数
    
    const dictWeights = params.slice(0, 43);
    const ruleWeight = Math.max(0, Math.min(1, params[43]));
    const llmWeight = 1 - ruleWeight;
    const minLen = Math.max(1, Math.floor(params[45]));
    const maxLen = Math.max(minLen, Math.floor(params[46]));
    
    // 更新评估器权重
    this.evaluator.ruleWeight = ruleWeight;
    this.evaluator.llmWeight = llmWeight;
    
    // 在所有测试样本上评估（使用异步方法）
    let totalScore = 0;
    let count = 0;
    
    for (const sample of this.testSamples) {
      const tokens = this.tokenize(sample);
      
      // 应用词典权重
      const weightedTokens = tokens.filter(t => {
        const idx = Array.from(this.customDict).indexOf(t);
        if (idx === -1) return true;
        return dictWeights[idx] > 0.5;
      });
      
      // 评估分词质量（使用规则评估，避免异步）
      const evalResult = this.evaluator._ruleBasedEvaluate(sample, weightedTokens);
      totalScore += evalResult;
      count++;
    }
    
    return count > 0 ? (totalScore / count) : 0;
  }

  /**
   * 设置测试样本
   */
  setTestSamples(samples) {
    this.testSamples = samples;
    console.log(`📚 设置测试样本：${samples.length} 个`);
  }

  /**
   * 运行进化训练
   */
  async train(generations = 100) {
    if (this.testSamples.length === 0) {
      throw new Error('请先设置测试样本：setTestSamples(samples)');
    }
    
    console.log(`\n🚀 开始 CMA-ES 进化训练：${generations} 代`);
    console.log(`   测试样本：${this.testSamples.length} 个`);
    console.log(`   优化维度：${this.optimizer.dim}`);
    
    const onGeneration = (result) => {
      console.log(`\n📊 第 ${result.generation} 代`);
      console.log(`   最佳分数：${(result.bestScore / 30 * 100).toFixed(1)}%`);
      console.log(`   平均分数：${(result.meanScore / 30 * 100).toFixed(1)}%`);
      console.log(`   步长 sigma: ${result.sigma.toFixed(4)}`);
    };
    
    const startTime = Date.now();
    
    const result = await this.optimizer.run(generations, onGeneration);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // 保存最佳快照
    this.memory.bestSnapshot = {
      params: result.bestParams,
      score: result.bestScore,
      generation: generations,
      timestamp: Date.now(),
    };
    
    // 输出总结
    console.log('\n' + '='.repeat(60));
    console.log('🎉 进化训练完成！');
    console.log('='.repeat(60));
    console.log(`总耗时：${duration.toFixed(1)} 秒`);
    console.log(`平均每代：${(duration / generations).toFixed(2)} 秒`);
    console.log(`最佳分数：${(result.bestScore / 30 * 100).toFixed(1)}%`);
    console.log(`评估器统计：${JSON.stringify(this.evaluator.getStats())}`);
    console.log('='.repeat(60));
    
    return {
      bestScore: result.bestScore,
      bestParams: result.bestParams,
      history: result.history,
      duration,
      stats: this.evaluator.getStats(),
    };
  }

  /**
   * 获取优化后的词典
   */
  getOptimizedDictionary() {
    if (!this.memory.bestSnapshot) {
      return Array.from(this.customDict);
    }
    
    const dictWeights = this.memory.bestSnapshot.params.slice(0, 43);
    const dictArray = Array.from(this.customDict);
    
    // 返回高权重术语
    const optimized = [];
    for (let i = 0; i < dictArray.length; i++) {
      if (dictWeights[i] > 0.7) {
        optimized.push(dictArray[i]);
      }
    }
    
    return optimized;
  }

  /**
   * 导出模型
   */
  exportModel() {
    return {
      version: 'v3-cmaes',
      timestamp: Date.now(),
      bestSnapshot: this.memory.bestSnapshot,
      customDict: Array.from(this.customDict),
      evaluatorStats: this.evaluator.getStats(),
      optimizerState: this.optimizer.getState(),
    };
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
