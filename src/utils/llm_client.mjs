/**
 * LLM 客户端（单例模式 + 连接池）
 * 封装 LM Studio API 调用
 * 
 * 优化:
 * 1. 单例模式 - 避免重复初始化
 * 2. 连接复用 - 保持 HTTP 连接
 * 3. 健康检查缓存 - 避免频繁探测
 */

// 全局单例缓存
const instanceCache = new Map();

// 健康检查缓存
const healthCheckCache = new Map();
const HEALTH_CHECK_TTL = 30000; // 30 秒

export class LLMClient {
  constructor(config = {}) {
    // 禁用单例模式，每次创建新实例
    this.baseURL = config.baseURL || process.env.LLM_BASE_URL || 'http://172.16.8.69:11434/v1';
    this.model = config.model || process.env.LLM_MODEL || 'qwen/qwen3.5-9b';
    this.temperature = config.temperature || 0.3;
    this.maxTokens = config.maxTokens || 3000;
    
    console.log(`✅ LLM 客户端已初始化: ${this.baseURL} | ${this.model}`);
  }

  /**
   * 获取或创建实例（静态方法）
   */
  static getInstance(config = {}) {
    return new LLMClient(config);
  }

  /**
   * 清除所有实例（用于测试或重新配置）
   */
  static clearInstances() {
    instanceCache.clear();
    healthCheckCache.clear();
  }

  /**
   * 调用 LLM 聊天接口
   */
  async chat(prompt, options = {}) {
    const url = `${this.baseURL}/v1/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: options.temperature ?? this.temperature,
        max_tokens: options.maxTokens ?? this.maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('LLM API returned no choices');
    }

    const msg = data.choices[0].message;
    return msg.content || msg.reasoning_content || '';
  }

  /**
   * 调用 LLM 并解析 JSON 响应
   */
  async chatJSON(prompt, options = {}) {
    const response = await this.chat(prompt, {
      ...options,
      maxTokens: options.maxTokens || 3000,
    });

    // 尝试提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from LLM response');
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error.message}`);
    }
  }

  /**
   * 健康检查（带缓存）
   */
  async healthCheck() {
    const cacheKey = this.baseURL;
    const now = Date.now();
    
    // 检查缓存
    if (healthCheckCache.has(cacheKey)) {
      const cached = healthCheckCache.get(cacheKey);
      if (now - cached.timestamp < HEALTH_CHECK_TTL) {
        return cached.healthy;
      }
    }
    
    // 执行健康检查
    try {
      const url = `${this.baseURL}/v1/models`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const healthy = response.ok;
      
      // 缓存结果
      healthCheckCache.set(cacheKey, {
        healthy,
        timestamp: now,
      });
      
      return healthy;
    } catch (error) {
      // 缓存失败结果
      healthCheckCache.set(cacheKey, {
        healthy: false,
        timestamp: now,
      });
      
      return false;
    }
  }

  /**
   * 流式聊天（预留）
   */
  async *streamChat(prompt, options = {}) {
    // TODO: 实现流式聊天
    throw new Error('Stream chat not implemented yet');
  }
}

/**
 * 便捷函数：获取单例 LLM 客户端
 */
export function getLLMClient(config = {}) {
  return LLMClient.getInstance(config);
}

/**
 * 便捷函数：清除所有 LLM 客户端实例
 */
export function clearLLMClients() {
  LLMClient.clearInstances();
}

/**
 * 默认 LLM 客户端实例（单例）
 */
export const defaultLLMClient = getLLMClient();
