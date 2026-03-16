/**
 * 自进化分词 Agent
 * 通过迭代优化分词效果
 */

import { LLMClient } from '../utils/llm_client.mjs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const JIEBA_SCRIPT = join(__dirname, '../utils/jieba_tokenizer.py');

export class SelfEvolvingTokenizer {
  constructor(config = {}) {
    this.llm = new LLMClient({
      baseURL: config.baseURL || 'http://127.0.0.1:5000',
      model: config.model || 'qwen3.5-9b', // 使用 9B 模型，更快
    });
    
    // 自定义词典（AI 领域）
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
    
    // 进化历史
    this.evolutionHistory = [];
    
    // 当前代数
    this.generation = 0;
    
    // 性能指标
    this.metrics = {
      avgScore: 0,
      bestScore: 0,
      totalIterations: 0,
    };
    
    // 测试 jieba
    this.jiebaAvailable = this._testJieba();
    
    console.log('✅ 自进化分词 Agent 初始化完成');
    console.log(`   模型：${config.model || 'qwen3.5-9b'}`);
    console.log(`   自定义词典：${this.customDict.size} 个术语`);
    console.log(`   jieba 分词：${this.jiebaAvailable ? '✅ 可用' : '⚠️ 不可用，使用内置'}`);
  }

  /**
   * 测试 jieba 可用性
   */
  _testJieba() {
    try {
      const result = execSync(`python "${JIEBA_SCRIPT}" test`, {
        encoding: 'utf-8',
        timeout: 5000
      });
      const parsed = JSON.parse(result);
      return parsed.success === true;
    } catch (error) {
      console.log('⚠️  jieba 测试失败:', error.message);
      return false;
    }
  }

  /**
   * 基础分词（使用 jieba 或内置）
   */
  tokenize(text) {
    if (this.jiebaAvailable) {
      // 使用 jieba Python 脚本
      try {
        const result = execSync(`python "${JIEBA_SCRIPT}" tokenize "${text}"`, {
          encoding: 'utf-8',
          timeout: 5000
        });
        const parsed = JSON.parse(result);
        if (parsed.success) {
          return parsed.tokens;
        }
      } catch (error) {
        console.log('⚠️  jieba 分词失败，使用内置分词器');
      }
    }
    
    // 内置简单分词（备用）
    return this._simpleTokenize(text);
  }

  /**
   * 简单分词（备用）
   */
  _simpleTokenize(text) {
    // 按标点和空格分词
    const tokens = text.split(/[\s,，.。:：;；!?！？]+/).filter(t => t.length > 0);
    
    // 尝试进一步切分长词
    const result = [];
    for (const token of tokens) {
      if (token.length > 4 && /[\u4e00-\u9fa5]/.test(token)) {
        // 中文长词，尝试按 2-3 字切分
        for (let i = 0; i < token.length; i += 2) {
          result.push(token.substring(i, i + 2));
        }
      } else {
        result.push(token);
      }
    }
    
    return result;
  }

  /**
   * 评估分词质量
   */
  async evaluateSegmentation(text, tokens) {
    const prompt = `评估以下中文分词的质量：

原文：${text}
分词结果：${tokens.join(' / ')}

评分标准：
1. 语义完整性（0-10 分）
2. 专业术语识别（0-10 分）
3. 粒度合理性（0-10 分）

输出 JSON：
{"score": 总分，"issues": ["问题 1", "问题 2"], "suggestions": ["建议 1", "建议 2"], "better_segmentation": ["更好的分词"]}`;

    try {
      const response = await this.llm.chatJSON(prompt, {
        maxTokens: 1000,
        temperature: 0.3,
      });

      return {
        success: true,
        score: response.score || 0,
        maxScore: 30,
        normalizedScore: (response.score || 0) / 30,
        issues: response.issues || [],
        suggestions: response.suggestions || [],
        betterSegmentation: response.better_segmentation || tokens,
      };
    } catch (error) {
      console.error('评估失败:', error.message);
      return {
        success: false,
        score: 15,
        maxScore: 30,
        normalizedScore: 0.5,
        error: error.message,
      };
    }
  }

  /**
   * 优化分词（基于评估）
   */
  async optimizeSegmentation(text, tokens, evaluation) {
    // 应用建议
    if (evaluation.betterSegmentation && evaluation.betterSegmentation.length > 0) {
      return evaluation.betterSegmentation;
    }

    // 如果没有更好的分词，使用原结果
    return tokens;
  }

  /**
   * 进化一轮
   */
  async evolve(text) {
    this.generation++;
    this.metrics.totalIterations++;

    // Step 1: 分词
    const tokens = this.tokenize(text);

    // Step 2: 评估
    const evaluation = await this.evaluateSegmentation(text, tokens);

    // Step 3: 优化
    const optimized = await this.optimizeSegmentation(text, tokens, evaluation);

    // Step 4: 记录
    this.evolutionHistory.push({
      generation: this.generation,
      text,
      original: tokens,
      optimized,
      score: evaluation.normalizedScore,
      timestamp: Date.now(),
    });

    // 更新指标
    this.metrics.avgScore = 
      this.evolutionHistory.reduce((sum, h) => sum + h.score, 0) / 
      this.evolutionHistory.length;
    
    this.metrics.bestScore = Math.max(
      this.metrics.bestScore,
      evaluation.normalizedScore
    );

    return {
      generation: this.generation,
      original: tokens,
      optimized,
      score: evaluation.normalizedScore,
      avgScore: this.metrics.avgScore,
      bestScore: this.metrics.bestScore,
    };
  }

  /**
   * 批量进化（多轮迭代）
   */
  async evolveBatch(texts, iterations = 100) {
    console.log(`\n🚀 开始进化训练：${texts.length} 个样本，${iterations} 轮迭代`);
    
    const results = [];

    for (let i = 0; i < iterations; i++) {
      // 随机选择一个样本
      const text = texts[Math.floor(Math.random() * texts.length)];
      
      const result = await this.evolve(text);
      results.push(result);

      // 每 10 轮汇报进度
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 第 ${i + 1}/${iterations} 轮`);
        console.log(`   平均分数：${(result.avgScore * 100).toFixed(1)}%`);
        console.log(`   最佳分数：${(result.bestScore * 100).toFixed(1)}%`);
        console.log(`   本代分数：${(result.score * 100).toFixed(1)}%`);
      }
    }

    // 总结
    const finalAvgScore = results.slice(-10).reduce((sum, r) => sum + r.score, 0) / 10;
    const initialAvgScore = results.slice(0, 10).reduce((sum, r) => sum + r.score, 0) / 10;
    const improvement = finalAvgScore - initialAvgScore;

    console.log('\n' + '='.repeat(60));
    console.log('🎉 进化训练完成！');
    console.log('='.repeat(60));
    console.log(`初始平均分：${(initialAvgScore * 100).toFixed(1)}%`);
    console.log(`最终平均分：${(finalAvgScore * 100).toFixed(1)}%`);
    console.log(`提升幅度：${(improvement * 100).toFixed(1)}%`);
    console.log(`总迭代数：${this.metrics.totalIterations}`);
    console.log('='.repeat(60));

    return {
      initialScore: initialAvgScore,
      finalScore: finalAvgScore,
      improvement,
      totalIterations: this.metrics.totalIterations,
      results,
    };
  }

  /**
   * 获取进化历史
   */
  getHistory(limit = 10) {
    return this.evolutionHistory.slice(-limit);
  }

  /**
   * 导出优化后的词典
   */
  exportDictionary() {
    return Array.from(this.customDict);
  }

  /**
   * 添加新词到词典
   */
  addWord(word) {
    this.customDict.add(word);
    console.log(`✅ 添加新词：${word}`);
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
