# 自进化测试问题分析与修复方案

**测试时间**: 2026-03-13 16:21  
**状态**: ❌ 测试失败，需要修复

---

## 📊 测试结果

### 基本数据
- **总轮数**: 50 轮
- **总耗时**: 2055.2 秒（约 34 分钟）
- **平均每轮**: 41.10 秒
- **缓存命中率**: 0.0%
- **回滚次数**: 0

### 进化效果
- **初始分数**: 50.0%
- **最终分数**: 50.0%
- **提升幅度**: 0.0%
- **结论**: ❌ 无进化效果

---

## ❌ 核心问题

### LLM JSON 解析失败

**错误日志**:
```
评估失败：Failed to extract JSON from LLM response
评估失败：Failed to extract JSON from LLM response
...
(50 次重复)
```

**原因分析**:

1. **提示词不够严格**
   ```javascript
   // 当前提示词
   const prompt = `评估中文分词质量：
   ...
   输出 JSON:
   {"score": 总分 (0-30),"issues": ["问题"],"suggestions": ["建议"]}`;
   
   // 问题：LLM 可能忽略格式要求，返回纯文本
   ```

2. **使用了 chatJSON 方法**
   ```javascript
   const response = await this.llm.chatJSON(prompt, {...});
   
   // chatJSON 内部提取 JSON 失败时抛出异常
   ```

3. **temperature 偏高**
   ```javascript
   temperature: 0.3  // 对于格式要求严格的场景，应该更低
   ```

---

## 🔧 修复方案

### 方案 1: 优化提示词（推荐）

```javascript
const prompt = `请严格评估以下中文分词质量，只输出 JSON，不要任何其他内容：

原文：${text}
分词结果：${tokens.join(' / ')}

评分标准：
1. 语义完整性 (0-10 分)
2. 专业术语识别 (0-10 分)
3. 粒度合理性 (0-10 分)

输出格式（必须严格遵循）：
{"score":数字,"issues":[],"suggestions":[]}`;

// 降低 temperature，提高确定性
const response = await this.llm.chat(prompt, {
  maxTokens: 500,
  temperature: 0.1,  // 从 0.3 降到 0.1
});
```

### 方案 2: 使用 System Prompt

```javascript
const response = await this.llm.chat(prompt, {
  systemPrompt: '你是一个 JSON 输出助手，只输出 JSON 格式，不输出任何其他内容。',
  maxTokens: 500,
  temperature: 0.1,
});
```

### 方案 3: 添加后处理

```javascript
try {
  const response = await this.llm.chat(prompt, {...});
  
  // 尝试提取 JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('LLM 未返回 JSON 格式');
  }
  
  const result = JSON.parse(jsonMatch[0]);
  return result;
} catch (error) {
  // 返回默认评估
  return {
    score: 20,  // 默认中等分数
    normalizedScore: 0.67,
    issues: ['LLM 评估失败'],
    suggestions: tokens,
  };
}
```

---

## 📋 修复步骤

### Step 1: 修改 evaluate 方法

文件：`src/agents/self_evolving_tokenizer_v2.mjs`

修改点：
1. 使用更严格的提示词
2. 降低 temperature 到 0.1
3. 添加 JSON 提取和后处理
4. 提供默认 fallback

### Step 2: 重新运行测试

```bash
cd PageIndex-CN
node test/test_self_evolution.mjs
```

### Step 3: 验证结果

预期结果：
- 缓存命中率 > 50%
- 最终分数 > 80%
- 提升幅度 > 10%

---

## 🎯 预期效果

### 修复后预期

| 指标 | 当前 | 预期 |
|------|------|------|
| **JSON 解析成功率** | 0% | > 95% |
| **缓存命中率** | 0% | > 50% |
| **初始分数** | 50% | 70-80% |
| **最终分数** | 50% | 85-95% |
| **提升幅度** | 0% | +15-20% |
| **平均每轮耗时** | 41s | 5-10s (有缓存后) |

---

## 💡 根本原因

**LLM 不遵循 JSON 格式要求的原因**:

1. **提示词不够明确** - "输出 JSON" 不够强制
2. **temperature 偏高** - 0.3 对于格式要求太宽松
3. **没有 system prompt** - 缺少全局格式约束
4. **maxTokens 过多** - 1000 tokens 让 LLM 觉得可以多说

**解决方案核心**:
- 明确告知"只输出 JSON，不要任何其他内容"
- 降低 temperature 到 0.1
- 减少 maxTokens 到 500
- 添加 JSON 提取和后处理 fallback

---

## 🚀 下一步行动

### 立即修复（5 分钟）
1. 修改 `evaluate` 方法
2. 优化提示词
3. 降低 temperature
4. 添加 fallback

### 重新测试（10-15 分钟）
1. 运行 50 轮进化测试
2. 监控 JSON 解析成功率
3. 验证缓存命中率

### 结果分析（5 分钟）
1. 对比修复前后效果
2. 评估进化算法有效性
3. 决定是否进行大规模测试

---

**负责人**: 耗电马喽 🐎⚡  
**创建时间**: 2026-03-13 16:21  
**状态**: 等待修复
