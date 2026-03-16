# Agent Team 配置说明

## ✅ 已完成

### 1. LM Studio 连通性测试
- **状态**: ✅ 成功
- **端点**: http://127.0.0.1:5000
- **模型**: qwen3.5-35b-a3b
- **响应**: HTTP 200 OK

### 2. Agent Team 架构

#### 角色分工
| Agent 角色 | 职责 | 状态 |
|-----------|------|------|
| **查询优化专家** | 分析查询意图、生成扩展查询、提取实体 | ✅ 完成 |
| **检索专家** | 多路召回（原始 + 扩展查询） | ✅ 完成 |
| **排序专家** | 去重、加权排序 | ✅ 完成 |
| **质量审核员** | 过滤低质量结果 | ✅ 完成 |

#### 核心文件
- `src/agents/query_rewrite_agent.mjs` - 查询优化 Agent
- `src/agents/agent_team.mjs` - Agent Team 协调器
- `test/recall_test_v4_agent.mjs` - Agent Team 召回率测试

### 3. 查询优化策略

#### 简单优化器（不依赖 LLM）
- **同义词扩展**: AI ↔ 人工智能 ↔ 智能
- **词干提取**: 发展历程 → 发展历
- **关键词提取**: 移除停用词

#### LLM 优化器（需要 LM Studio）
- **意图识别**: 分析查询核心意图
- **查询重写**: 生成 3-5 个查询变体
- **实体提取**: 人名、地名、组织名、时间
- **同义词生成**: 上下文相关的同义词

### 4. 测试结果

#### 简单优化器测试 ✅
```
查询："中国 AI 发展历程"
扩展词：中国，AI, 人工智能，智能，机器智能，发展历程...
关键词：中国，AI, 发展历程
```

#### LLM 优化器测试 ⚠️
- **状态**: 部分成功
- **问题**: JSON 解析格式需要优化
- **建议**: 调整系统提示词，确保 JSON 输出格式

---

## 🔧 配置说明

### 环境变量
```powershell
$env:LLM_BASE_URL="http://127.0.0.1:5000"
$env:LLM_MODEL="qwen3.5-35b-a3b"
```

### 使用示例

#### 1. 简单查询优化
```javascript
import { SimpleQueryOptimizer } from './src/agents/query_rewrite_agent.mjs';

const optimizer = new SimpleQueryOptimizer();
const expanded = optimizer.expandQuery('中国 AI 发展历程');
console.log(expanded);
// ['中国 AI 发展历程', '中国', 'AI', '人工智能', '智能', ...]
```

#### 2. Agent Team 查询
```javascript
import { AgentTeamCoordinator } from './src/agents/agent_team.mjs';

const coordinator = new AgentTeamCoordinator({
  baseURL: 'http://127.0.0.1:5000',
  model: 'qwen3.5-35b-a3b',
});

coordinator.loadIndex('enhanced_index.json');
const result = await coordinator.query('中国 AI 发展历程');
console.log(result.topResults);
```

#### 3. 运行测试
```bash
# 快速测试（不依赖 LLM）
node test/agent_team_quick_test.mjs

# 完整召回率测试（需要 LLM）
npm run test:recall:agent
```

---

## 📊 预期效果

### 方案 A: 增强查询理解
- **当前召回率**: 82.2%
- **预期提升**: +5-8%
- **目标召回率**: 87-90%

### 优化来源
1. **同义词扩展**: +2-3%
2. **查询重写**: +2-3%
3. **多路召回**: +1-2%

---

## ⚠️ 已知问题

1. **LLM JSON 输出格式**
   - 问题：LLM 返回的 JSON 可能包含额外文本
   - 解决：优化提示词，使用更严格的格式要求

2. **查询延迟**
   - 问题：LLM 调用增加 1-2 秒延迟
   - 解决：缓存优化结果、异步处理

3. **简单优化器覆盖不足**
   - 问题：同义词库有限
   - 解决：扩展同义词库、添加领域词典

---

## 🎯 下一步

### 立即可做（15 分钟）
- [ ] 扩展同义词库（添加更多中文词汇）
- [ ] 优化 LLM 提示词（确保 JSON 格式）
- [ ] 添加查询缓存机制

### 短期优化（1 小时）
- [ ] 实施多路召回融合
- [ ] 添加 BM25 全文检索
- [ ] 优化排序算法

### 中期目标（1 天）
- [ ] 召回率达到 90%+
- [ ] 查询延迟 < 500ms
- [ ] 完善单元测试

---

**负责人**: 耗电马喽 🐎⚡  
**创建时间**: 2026-03-13 15:15  
**状态**: Agent Team 已就绪，等待优化
