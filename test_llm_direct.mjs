#!/usr/bin/env node
/**
 * 直接测试 LLM API
 */

const url = 'http://172.16.8.69:11434/v1/chat/completions';
const prompt = `你是一个查询优化专家。查询"临床试验时adr数据漏记，违反哪些规定，如何处理"，请提取意图、关键词。只输出JSON格式。`;

const body = {
  model: 'qwen/qwen3.5-9b',
  messages: [{role: 'user', content: prompt}],
  max_tokens: 2000,
  temperature: 0.3,
  stream: false
};

console.log('Sending request...');

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body)
});

const data = await response.json();

if (data.choices && data.choices.length > 0) {
  const msg = data.choices[0].message;
  const content = msg.content || msg.reasoning_content;
  console.log('\n✅ Success!');
  console.log('Response:', content);
} else {
  console.log('\n❌ Failed');
  console.log('Response:', JSON.stringify(data, null, 2));
}