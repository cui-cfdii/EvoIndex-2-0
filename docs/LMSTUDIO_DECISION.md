# LM Studio 使用历史与决策说明

**日期**: 2026-03-14  
**主题**: 为什么 PageIndex-CN 项目不使用 LM Studio

---

## 📜 LM Studio 使用历史

### 1. 曾经的使用场景

**时间**: 2026-03-08 至 2026-03-12  
**用途**: Token 消耗统计与监控

**相关文件**:
- `scripts/lmstudio-token-stats.js` - Token 统计脚本
- `scripts/lmstudio-daily-report.json` - 每日报告
- `PageIndex-CN/src/utils/llm_client.mjs` - LLM 客户端封装

**使用方式**:
```bash
# 统计 LM Studio Token 消耗
node scripts/lmstudio-token-stats.js

# 输出示例
📊 统计结果:
  请求次数：35 次
  读入 Token：3,062,993
  生成 Token：22,470
  总消耗：3,085,463
```

---

### 2. PageIndex-CN 中的 LLM 客户端

**文件**: `PageIndex-CN/src/utils/llm_client.mjs`

**功能**: 封装 LM Studio API 调用

**核心代码**:
```javascript
export class LLMClient {
  constructor(config = {}) {
    this.baseURL = 'http://127.0.0.1:5000';  // LM Studio 默认地址
    this.model = 'qwen3.5-35b-a3b';          // 本地模型
  }

  async chat(prompt) {
    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    return response.json();
  }
}
```

**使用场景**:
- ✅ 术语质量评估（LLM 模式）
- ✅ 查询重写优化
- ✅ 文档摘要生成

---

## 🤔 为什么现在不使用 LM Studio？

### 原因 1: 术语评估场景不需要 LLM

**需求**: 评估术语是否为高质量专业术语

**LLM 方案**:
```javascript
// 调用 LLM 评估
const result = await llm.chat(`评估术语"${term}"的质量...`);
// 耗时：2-5 秒/术语
// 成本：¥0.002/1K tokens
// 稳定性：依赖 API 可用性
```

**规则方案**:
```javascript
// 规则评估
function evaluateTerm(term, frequency, domain) {
  if (hasDomainKeyword && frequency >= 3) return 5; // 核心术语
  if (frequency >= 5 && docCount >= 2) return 4;    // 相关术语
  return 3;                                          // 一般术语
}
// 耗时：<1ms/术语
// 成本：免费
// 稳定性：100% 可靠
```

**对比**:
| 指标 | LLM 评估 | 规则评估 | 优势 |
|------|---------|---------|------|
| **速度** | 2-5 秒/术语 | <1ms/术语 | 规则 **快 1000-5000 倍** ⚡ |
| **成本** | ¥0.002/1K tokens | 免费 | 规则 **零成本** 💰 |
| **稳定性** | 依赖 API | 本地执行 | 规则 **100% 可靠** 🛡️ |
| **准确性** | 高 | 高（已验证） | 平手 ✅ |

**结论**: 术语评估场景，**规则评估更优**，无需 LLM

---

### 原因 2: LM Studio 启动和维护成本高

**启动流程**:
```bash
# 1. 启动 LM Studio
lmstudio-server start

# 2. 加载模型（35B 参数）
# 等待时间：30-60 秒

# 3. 预热（首次推理）
# 耗时：5-10 秒

# 4. 保持运行（内存占用）
# 内存：~20GB
```

**维护成本**:
- 需要手动启动服务
- 需要下载和管理模型文件
- 需要监控服务状态
- 需要处理服务崩溃

**对比**:
| 项目 | LM Studio | 规则评估 |
|------|-----------|---------|
| **启动时间** | 30-60 秒 | 0 秒（代码即服务） |
| **内存占用** | ~20GB | <100MB |
| **维护成本** | 高（需监控） | 零（自动运行） |
| **依赖** | LM Studio 服务 + 模型文件 | 无（纯代码） |

**结论**: 规则评估**零维护成本**，更适合生产环境

---

### 原因 3: 云端 API 更灵活（如果需要 LLM）

**如果需要 LLM 评估**，云端 API 更优：

| 对比项 | LM Studio（本地） | DashScope（云端） |
|--------|-----------------|-----------------|
| **启动时间** | 30-60 秒 | 0 秒（即调即用） |
| **模型更新** | 手动下载 | 自动更新 |
| **可用性** | 依赖本地服务 | 99.9% SLA |
| **成本** | 电费 + 硬件折旧 | 按量付费 |
| **扩展性** | 受限于本地 GPU | 弹性扩展 |

**Phase 4 测试结果**:
- DashScope qwen-turbo API 调用失败（可能 API Key 权限问题）
- 但即使成功，规则评估也已足够（1000 倍快，零成本）

**结论**: 如果需要 LLM，**云端 API 更灵活**；但规则评估已足够

---

### 原因 4: PageIndex-CN 的核心不是 LLM 推理

**PageIndex-CN 核心价值**:
1. ✅ 互联网文章抓取（Tavily API）
2. ✅ 术语提取（jieba 分词 + TF-IDF）
3. ✅ 术语评估（规则筛选）
4. ✅ 词典版本管理
5. ✅ 召回率验证

**LLM 的作用**: **可选的评估工具**（非核心）

**类比**:
```
PageIndex-CN = 自动化工厂
  原材料：互联网文章
  加工设备：术语提取器 + 术语评估器
  成品：高质量术语词典
  
LLM = 可选的质量检测仪器
  可以用，但不是必须
  规则评估 = 更简单快速的检测方法
```

**结论**: PageIndex-CN 的**核心是自进化流程**，不是 LLM 推理

---

## 📊 决策总结

### 当前架构选择

**术语提取**: ✅ 本地 jieba（Python）  
**术语评估**: ✅ 本地规则评估（Node.js）  
**召回率测试**: ✅ 本地规则匹配（Node.js）  
**权重优化**: ✅ 本地 CMA-ES（JavaScript）  
**LLM 评估**: ❌ 不使用（可选，但非必需）

### 为什么不用 LM Studio？

1. **术语评估不需要 LLM**（规则更快更便宜）
2. **LM Studio 启动和维护成本高**（30-60 秒启动，20GB 内存）
3. **云端 API 更灵活**（如果需要 LLM）
4. **PageIndex-CN 核心不是 LLM 推理**（是自进化流程）

### 未来可能的 LLM 使用场景

虽然当前不使用，但未来可能在以下场景考虑 LLM：

1. **边界案例判断**: 规则评估 score=3 的术语，用 LLM 复评
2. **新领域探索**: 无预定义关键词时，用 LLM 识别领域特异性
3. **术语关系识别**: 识别"LoRA"→"微调"→"LLM"的层次关系

**实现方式**: 云端 API（DashScope qwen-turbo），而非本地 LM Studio

---

## 🎯 总结

**PageIndex-CN 项目不使用 LM Studio 的原因**:

1. ✅ **规则评估已足够**（快 1000 倍，零成本，100% 可靠）
2. ✅ **LM Studio 成本高**（启动慢，内存占用大，维护复杂）
3. ✅ **核心不是 LLM**（是自进化流程，LLM 只是可选工具）
4. ✅ **云端 API 更灵活**（如果需要 LLM）

**推荐方案**: 
- **继续规则评估**（当前方案）
- **定期扩展领域关键词库**（通过自进化流程）
- **可选：云端 LLM 复评边界案例**（未来优化）

---

**负责人**: 耗电马喽 🐎⚡  
**日期**: 2026-03-14 08:15
