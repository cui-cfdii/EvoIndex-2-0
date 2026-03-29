#!/usr/bin/env node
/**
 * 测试本地 LLM 查询优化
 */

import { LLMClient } from './src/utils/llm_client.mjs';
import { LLMClient as _ } from './src/utils/llm_client.mjs';

// 清除缓存
LLMClient.clearInstances();

const llm = new LLMClient({
  baseURL: 'http://172.16.8.69:11434/v1',
  model: 'qwen/qwen3.5-9b',
  maxTokens: 3000
});

console.log('🔄 意图识别与查询优化...\n');

const prompt = `你是一个专业的查询优化专家。

任务：
1. 分析用户查询的意图
2. 生成 3-5 个查询变体
3. 提取关键实体和关键词

查询：临床试验时adr数据漏记，违反哪些规定，如何处理

只输出 JSON，不要其他内容。格式：
{"intent":"意图描述","expanded_queries":["变体1","变体2"],"keywords":["词1","词2"],"entities":[{"name":"实体","type":"类型"}]}`;

try {
  const response = await llm.chat(prompt);
  console.log('📊 LLM 响应:');
  console.log(response);
  
  // 尝试解析 JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const result = JSON.parse(jsonMatch[0]);
    console.log('\n✅ 解析成功:');
    console.log('  意图:', result.intent);
    console.log('  扩展查询:', result.expanded_queries);
    console.log('  关键词:', result.keywords);
  }
} catch (e) {
  console.error('❌ 错误:', e.message);
}