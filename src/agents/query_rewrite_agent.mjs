/**
 * 提示词优化 Agent
 * 专门负责优化查询语句，提升召回率
 */

import { LLMClient } from '../utils/llm_client.mjs';

export class QueryRewriteAgent {
  constructor(config = {}) {
    this.llm = new LLMClient({
      baseURL: config.baseURL || 'http://127.0.0.1:5000',
      model: config.model || 'qwen3.5-35b-a3b',
    });
    
    this.systemPrompt = `你是一个专业的查询优化专家。

任务：
1. 分析用户查询的意图
2. 生成 3-5 个查询变体
3. 提取关键实体和关键词
4. 提供同义词

只输出 JSON，不要其他内容。格式：
{"intent":"意图描述","expanded_queries":["变体 1","变体 2"],"entities":[{"name":"实体","type":"类型"}],"keywords":["词 1","词 2"],"synonyms":{"原词":["同义词"]}}`;
  }

  /**
   * 优化查询
   */
  async optimizeQuery(query) {
    const prompt = `优化查询：${query}

输出 JSON:`;

    try {
      const response = await this.llm.chat(prompt, {
        maxTokens: 1500,
        temperature: 0.3,
      });

      // 提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法提取 JSON');
      }

      const result = JSON.parse(jsonMatch[0]);

      // 验证必需字段
      return {
        success: true,
        original: query,
        optimized: {
          intent: result.intent || '查询优化',
          expanded_queries: result.expanded_queries || [query],
          entities: result.entities || [],
          keywords: result.keywords || query.split(/\s+/),
          synonyms: result.synonyms || {},
        },
      };
    } catch (error) {
      console.error('查询优化失败:', error.message);
      return {
        success: false,
        original: query,
        error: error.message,
        fallback: {
          expanded_queries: [query],
          keywords: query.split(/\s+/),
          synonyms: {},
        },
      };
    }
  }

  /**
   * 批量优化查询
   */
  async optimizeBatch(queries) {
    const results = [];

    for (const query of queries) {
      const result = await this.optimizeQuery(query);
      results.push(result);
    }

    return results;
  }
}

/**
 * 查询优化器（简化版，用于快速测试）
 */
export class SimpleQueryOptimizer {
  constructor() {
    this.synonyms = {
      // AI 相关
      'AI': ['人工智能', '智能', '机器智能', 'AI 技术'],
      '人工智能': ['AI', '智能', '机器智能', '人工智慧'],
      '智能': ['AI', '人工智能', '智能化', '智慧'],
      '模型': ['大模型', 'LLM', '语言模型', '深度学习模型'],
      '大模型': ['模型', 'LLM', '基础模型', '预训练模型'],
      
      // 技术相关
      '技术': ['方法', '方案', '手段', '技艺'],
      '应用': ['应用场景', '落地', '案例', '使用', '用途'],
      '应用场景': ['应用', '落地场景', '使用场景', '案例'],
      '部署': ['安装', '配置', '搭建', '设置', '部署方案'],
      '方案': ['方法', '方式', '选择', '策略', '计划'],
      
      // 开发相关
      '微调': ['fine-tuning', '训练', '优化', '调整', '精调'],
      '训练': ['微调', '学习', '训练过程', '模型训练'],
      '优化': ['优化方法', '改进', '提升', 'optimization'],
      '开发': ['研发', '构建', '实现', '编程'],
      
      // 城市相关
      '城市': ['都市', '市政', '城镇'],
      '智慧': ['智能', 'smart', '智能化', '聪明'],
      '智慧城市': ['智能城市', '智慧都市', 'smart city'],
      
      // 发展相关
      '发展': ['演进', '进步', '成长', '历程', '历史', '演变'],
      '历程': ['发展', '历史', '过程', '轨迹', '演进'],
      '历史': ['发展历程', '演变史', '发展史', 'history'],
      
      // 视觉相关
      '视觉': ['图像', '影像', 'picture', 'vision', '图像识别'],
      '计算机视觉': ['CV', '图像识别', '视觉技术', 'computer vision'],
      '图像': ['图片', '影像', 'image', '视觉'],
      
      // 开源相关
      '开源': ['open-source', '开放源码', '免费', '开放源代码'],
      '开放': ['开源', '公开', 'open'],
      
      // 其他常用词
      '方法': ['方式', '办法', '技巧', 'approach'],
      '系统': ['平台', '体系', 'system'],
      '平台': ['系统', '平台工具', 'platform'],
      '工具': ['软件', '应用', 'tools'],
      '软件': ['工具', '应用程序', 'software'],
    };
    
    // 停用词
    this.stopWords = [
      '的', '了', '是', '在', '和', '与', '及', '等', '一个', '一些',
      '如何', '怎么', '什么', '哪个', '哪些', '怎样', '为何', '为什么'
    ];
  }

  /**
   * 快速扩展查询
   */
  expandQuery(query) {
    const words = query.split(/\s+/);
    const expanded = new Set([query]);

    for (const word of words) {
      expanded.add(word);

      if (this.synonyms[word]) {
        for (const synonym of this.synonyms[word]) {
          expanded.add(synonym);
        }
      }
      
      // 添加相关短语
      if (word.length > 2) {
        expanded.add(word.substring(0, word.length - 1));
        expanded.add(word.substring(1));
      }
    }

    return Array.from(expanded);
  }

  /**
   * 提取关键词
   */
  extractKeywords(query) {
    const words = query.split(/\s+/);
    return words.filter(w => !this.stopWords.includes(w) && w.length > 0);
  }
  
  /**
   * 获取同义词
   */
  getSynonyms(word) {
    return this.synonyms[word] || [];
  }
}
