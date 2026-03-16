/**
 * Bailian 云端模型客户端
 * 使用阿里云百炼平台的 Qwen 模型
 */

export class BailianClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.DASHSCOPE_API_KEY;
    this.model = config.model || 'qwen3.5-plus';
    this.baseURL = 'https://dashscope.aliyuncs.com/api/v1';
    
    if (!this.apiKey) {
      console.warn('⚠️  未设置 DASHSCOPE_API_KEY，请检查配置');
    }
  }

  /**
   * 调用 Bailian API
   */
  async chat(prompt, options = {}) {
    const url = `${this.baseURL}/services/aigc/text-generation/generation`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || this.model,
        input: {
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        parameters: {
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 2000,
          result_format: 'message',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Bailian API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (!data.output || !data.output.choices || data.output.choices.length === 0) {
      throw new Error('Bailian API returned no choices');
    }

    return data.output.choices[0].message.content;
  }

  /**
   * 调用并解析 JSON 响应
   */
  async chatJSON(prompt, options = {}) {
    const response = await this.chat(prompt, {
      ...options,
      maxTokens: options.maxTokens || 3000,
    });

    // 尝试提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error.message}`);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const response = await this.chat('你好', { maxTokens: 10 });
      return !!response;
    } catch (error) {
      console.error('Bailian health check failed:', error.message);
      return false;
    }
  }
}

/**
 * 通用 LLM 客户端（支持本地和云端）
 */
export class UniversalLLMClient {
  constructor(config = {}) {
    this.mode = config.mode || process.env.LLM_MODE || 'cloud'; // 'cloud' or 'local'
    
    if (this.mode === 'cloud') {
      this.client = new BailianClient(config);
      console.log('✅ 使用云端模型:', config.model || 'qwen3.5-plus');
    } else {
      // 动态导入本地客户端
      this.client = null; // 懒加载
      console.log('✅ 使用本地模型:', config.model || 'qwen3.5-35b-a3b');
    }
  }

  async chat(prompt, options = {}) {
    if (this.mode === 'cloud') {
      return this.client.chat(prompt, options);
    } else {
      // 本地客户端懒加载
      if (!this.client) {
        const { LLMClient } = await import('./llm_client.mjs');
        this.client = new LLMClient(options);
      }
      return this.client.chat(prompt, options);
    }
  }

  async chatJSON(prompt, options = {}) {
    if (this.mode === 'cloud') {
      return this.client.chatJSON(prompt, options);
    } else {
      if (!this.client) {
        const { LLMClient } = await import('./llm_client.mjs');
        this.client = new LLMClient(options);
      }
      return this.client.chatJSON(prompt, options);
    }
  }

  async healthCheck() {
    return this.client.healthCheck();
  }
}
