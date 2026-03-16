# PageIndex-CN v2.0 - 项目说明书

## 项目概述

**项目名称**: PageIndex-CN v2.0
**核心目标**: 基于微软 GraphRAG 思想，实现高性能混合检索系统
**技术路线**: 树检索 + 实体关系 + 社区摘要
**当前版本**: v2.0 (重构版)
**原版本**: v1.0 (纯树检索)

---

## 一、改造目标

### 1.1 功能目标

| 指标 | v1.0 (当前) | v2.0 (目标) | 提升 |
|------|------------|------------|------|
| **召回率** | 60-70% | 80-90% | +20-30% |
| **多样性** | 50-60% | 75-85% | +25% |
| **查询时间** | <10ms | <100ms | +10x (可接受) |
| **索引时间** | 10-30s | 3-5min | +10x (一次性成本) |

### 1.2 技术目标

- ✅ 实体关系提取（基于本地 LLM）
- ✅ 社区检测（Leiden 算法）
- ✅ 社区摘要生成（层次化）
- ✅ 混合检索（标题 + 实体 + 社区）
- ✅ 可扩展架构（模块化设计）

---

## 二、系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                   PageIndex-CN v2.0                 │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────┐      ┌─────────────┐              │
│  │  输入文档    │ ───> │  文档解析器  │              │
│  │  (Markdown) │      │  (Parser)   │              │
│  └─────────────┘      └──────┬──────┘              │
│                              │                      │
│                              v                      │
│  ┌──────────────────────────────────────┐          │
│  │          树索引构建器                  │          │
│  │    (Tree Index Builder)              │          │
│  │  ┌────────────────────────────────┐  │          │
│  │  │ 章节解析 → 层次化树结构         │  │          │
│  │  └────────────────────────────────┘  │          │
│  └───────────────┬──────────────────────┘          │
│                  │                                  │
│                  v                                  │
│  ┌──────────────────────────────────────┐          │
│  │      实体关系提取器                  │          │
│  │   (Entity-Relation Extractor)        │          │
│  │  ┌────────────────────────────────┐  │          │
│  │  │ 本地 LLM (Qwen3.5-35B-A3B)      │  │          │
│  │  │ 实体提取 + 关系识别             │  │          │
│  │  └────────────────────────────────┘  │          │
│  └───────────────┬──────────────────────┘          │
│                  │                                  │
│                  v                                  │
│  ┌──────────────────────────────────────┐          │
│  │        社区检测器                    │          │
│  │     (Community Detector)             │          │
│  │  ┌────────────────────────────────┐  │          │
│  │  │ Leiden 算法                    │  │          │
│  │  │ 层次化社区检测 (C0 → C1 → C2)   │  │          │
│  │  └────────────────────────────────┘  │          │
│  └───────────────┬──────────────────────┘          │
│                  │                                  │
│                  v                                  │
│  ┌──────────────────────────────────────┐          │
│  │      社区摘要生成器                  │          │
│  │   (Community Summarizer)             │          │
│  │  ┌────────────────────────────────┐  │          │
│  │  │ 本地 LLM 生成摘要               │  │          │
│  │  │ 自底向上层次化汇总              │  │          │
│  │  └────────────────────────────────┘  │          │
│  └───────────────┬──────────────────────┘          │
│                  │                                  │
│                  v                                  │
│  ┌──────────────────────────────────────┐          │
│  │        增强索引文件                  │          │
│  │    (Enhanced Index JSON)             │          │
│  │  { tree, entities, communities }    │          │
│  └───────────────┬──────────────────────┘          │
└──────────────────┼──────────────────────────────────┘
                   │
                   v
┌─────────────────────────────────────────────────────┐
│                  查询阶段                          │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────┐      ┌─────────────┐              │
│  │   用户查询   │ ───> │ 混合检索引擎 │              │
│  └─────────────┘      └──────┬──────┘              │
│                              │                      │
│                              v                      │
│  ┌──────────────────────────────────────┐          │
│  │         混合评分算法                  │          │
│  │  ┌────────────────────────────────┐  │          │
│  │  │ 标题匹配: 40%                  │  │          │
│  │  │ 实体关系: 30%                  │  │          │
│  │  │ 社区相关: 30%                  │  │          │
│  │  └────────────────────────────────┘  │          │
│  └───────────────┬──────────────────────┘          │
│                  │                                  │
│                  v                                  │
│  ┌──────────────────────────────────────┐          │
│  │          排序返回结果                  │          │
│  └──────────────────────────────────────┘          │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 2.2 模块设计

#### 模块 1: 文档解析器 (parser.mjs)
- **功能**: 解析 Markdown 文档，提取章节结构
- **输入**: Markdown 文件路径
- **输出**: 章节树结构
- **状态**: ✅ 已实现 (v1.0)

#### 模块 2: 树索引构建器 (tree.mjs)
- **功能**: 构建层次化检索树
- **输入**: 章节树结构
- **输出**: JSON 索引文件
- **状态**: ✅ 已实现 (v1.0)

#### 模块 3: 实体关系提取器 (entity_extractor.mjs) ⭐新增
- **功能**: 从文本中提取实体和关系
- **输入**: 文本片段
- **输出**: 实体列表 + 关系列表
- **技术**: 本地 LLM (Qwen3.5-35B-A3B)
- **状态**: ❌ 待实现

#### 模块 4: 社区检测器 (community_detector.mjs) ⭐新增
- **功能**: 检测实体关系图中的社区
- **输入**: 实体关系图
- **输出**: 层次化社区结构
- **技术**: Leiden 算法
- **状态**: ❌ 待实现

#### 模块 5: 社区摘要生成器 (community_summarizer.mjs) ⭐新增
- **功能**: 为每个社区生成摘要
- **输入**: 社区实体 + 关系
- **输出**: 社区摘要
- **技术**: 本地 LLM (Qwen3.5-35B-A3B)
- **状态**: ❌ 待实现

#### 模块 6: 混合检索引擎 (hybrid_query.mjs) ⭐新增
- **功能**: 执行混合检索
- **输入**: 查询 + 增强索引
- **输出**: 排序后的结果
- **算法**: 混合评分 (40% + 30% + 30%)
- **状态**: ❌ 待实现

---

## 三、实现计划

### 3.1 Phase 1: 基础设施搭建 (Week 1)

#### 任务 1.1: 安装依赖
```bash
npm install graphology graphology-communities-leiden
npm install --save-dev @types/node
```

#### 任务 1.2: 目录结构重组
```
PageIndex-CN/
├── src/
│   ├── core/              # 核心模块
│   │   ├── parser.mjs
│   │   ├── tree.mjs
│   │   ├── entity_extractor.mjs      # 新增
│   │   ├── community_detector.mjs    # 新增
│   │   ├── community_summarizer.mjs  # 新增
│   │   └── hybrid_query.mjs          # 新增
│   ├── utils/             # 工具函数
│   │   ├── llm_client.mjs            # LLM 客户端
│   │   ├── graph_utils.mjs           # 图工具
│   │   └── scoring.mjs               # 评分算法
│   └── index.mjs           # 主入口
├── test/                   # 测试
│   ├── unit/              # 单元测试
│   ├── integration/       # 集成测试
│   └── benchmarks/        # 性能测试
├── data/                  # 测试数据
│   ├── test_documents/    # 测试文档
│   └── benchmarks/        # 基准数据
├── docs/                  # 文档
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── TESTING.md
├── package.json
└── README.md
```

**验收标准**:
- [x] 目录结构完成
- [x] 依赖安装成功
- [x] 现有模块迁移完成

---

### 3.2 Phase 2: 实体关系提取 (Week 2)

#### 任务 2.1: LLM 客户端封装
**文件**: `src/utils/llm_client.mjs`

**功能**:
- 连接 LM Studio API
- 支持流式输出
- 错误处理和重试机制

**API 设计**:
```javascript
class LLMClient {
  constructor(baseURL = 'http://localhost:1234')

  async chat(prompt, options = {})

  async streamChat(prompt, options = {})
}
```

#### 任务 2.2: 实体关系提取实现
**文件**: `src/core/entity_extractor.mjs`

**Prompt 设计**:
```javascript
const EXTRACT_ENTITIES_PROMPT = `
从以下文本中提取实体和关系：

文本：
{text}

输出格式（JSON）：
{
  "entities": [
    {"name": "实体名", "type": "类型", "description": "描述"}
  ],
  "relationships": [
    {"source": "实体1", "target": "实体2", "type": "关系", "description": "描述"}
  ]
}

要求：
- 实体类型：人名、地名、组织、技术、概念
- 关系类型：属于、包含、引用、相关、使用
- 只提取明确的实体，避免过度提取
`;
```

**验收标准**:
- [ ] 能正确提取 90% 以上实体
- [ ] 能正确识别 80% 以上关系
- [ ] 处理速度 < 3秒/千字
- [ ] 单元测试覆盖率 > 80%

---

### 3.3 Phase 3: 社区检测 (Week 3)

#### 任务 3.1: 图构建
**文件**: `src/utils/graph_utils.mjs`

**功能**:
- 将实体关系转换为 graphology 图
- 支持节点/边的属性存储

#### 任务 3.2: Leiden 算法集成
**文件**: `src/core/community_detector.mjs`

**功能**:
- 执行 Leiden 社区检测
- 递归检测子社区
- 返回层次化社区结构

**API 设计**:
```javascript
class CommunityDetector {
  detectCommunities(graph, options = {
    resolution: 1.0,
    maxLevels: 3
  })

  // 返回层次化结构
  // C0 (根) → C1 → C2 (叶)
}
```

**验收标准**:
- [ ] 能正确识别社区边界
- [ ] 支持层次化社区
- [ ] 处理 1000+ 节点图 < 1秒
- [ ] 单元测试覆盖率 > 80%

---

### 3.4 Phase 4: 社区摘要 (Week 4)

#### 任务 4.1: 摘要生成实现
**文件**: `src/core/community_summarizer.mjs`

**Prompt 设计**:
```javascript
const SUMMARIZE_COMMUNITY_PROMPT = `
为以下实体社区生成摘要：

实体：
{entities}

关系：
{relationships}

摘要要求：
1. 概括社区的核心主题
2. 说明主要实体及其关系
3. 长度控制在 200 字以内
4. 使用简洁准确的语言
`;

const HIERARCHICAL_SUMMARY_PROMPT = `
基于以下子社区摘要，生成父社区摘要：

子社区摘要：
{childSummaries}

摘要要求：
1. 概括所有子社区的主题
2. 避免细节，关注整体
3. 长度控制在 300 字以内
`;
```

**验收标准**:
- [ ] 摘要准确反映社区主题
- [ ] 长度控制在要求范围内
- [ ] 支持层次化汇总
- [ ] 单元测试覆盖率 > 80%

---

### 3.5 Phase 5: 混合检索 (Week 5)

#### 任务 5.1: 混合评分算法
**文件**: `src/utils/scoring.mjs`

**算法**:
```javascript
function hybridScore(node, query, context) {
  const titleScore = titleMatch(node.title, query);
  const entityScore = entityMatch(node.entities, query);
  const communityScore = communityRelevance(
    node.communityId,
    query,
    context.communitySummaries
  );

  return 0.4 * titleScore +
         0.3 * entityScore +
         0.3 * communityScore;
}
```

#### 任务 5.2: 混合检索引擎
**文件**: `src/core/hybrid_query.mjs`

**API 设计**:
```javascript
class HybridQueryEngine {
  constructor(indexPath)

  async query(query, options = {
    topK: 10,
    minScore: 0.3
  })

  async queryWithExplanation(query) // 返回评分明细
}
```

**验收标准**:
- [ ] 查询响应时间 < 100ms
- [ ] 召回率 > 80% (对比 v1.0)
- [ ] 多样性 > 75% (对比 v1.0)
- [ ] 单元测试覆盖率 > 80%

---

## 四、测试策略

### 4.1 测试数据集选择

#### 标准推荐
基于 GraphRAG 论文和实践经验，推荐以下测试数据集：

| 数据集 | 规模 | 类型 | 特点 |
|--------|------|------|------|
| **MS MARCO** | 8.8M passages | 问答 | 标准检索基准 |
| **HotpotQA** | 120k QA | 多跳推理 | 需要实体关系 |
| **SQuAD 2.0** | 150k QA | 阅读理解 | 长文档 |
| **Wikipedia** | 1M+ articles | 知识图谱 | 层次化结构 |
| **OpenClaw KB** | ~100 articles | 技术文档 | 真实场景 |

**优先级**:
1. **Wikipedia** - 最适合测试层次化检索
2. **HotpotQA** - 测试实体关系
3. **OpenClaw KB** - 真实场景验证

#### 获取方案

**方案 A: Wikipedia (推荐)**
```bash
# 使用 wikiextractor
pip install wikiextractor

# 提取中文 Wikipedia
wikiextractor -o data/wikipedia --json zhwiki-latest-pages-articles.xml.bz2
```

**方案 B: HotpotQA**
```bash
# 下载 HotpotQA 数据集
wget http://qim.fs.quoracdn.net/hotpotqa.zip
unzip hotpotQA.zip -d data/hotpotqa
```

**方案 C: OpenClaw KB**
```bash
# 使用已有知识库
cp -r ~/.openclaw/workspace/ai-openclaw-kb/data/*.md data/test_documents/
```

---

### 4.2 测试类型

#### 单元测试 (Unit Tests)
- **目标**: 验证每个模块的功能正确性
- **工具**: Node.js 内置 `assert`
- **覆盖率**: > 80%

```javascript
// test/unit/entity_extractor.test.mjs
import { EntityExtractor } from '../../src/core/entity_extractor.mjs';
import assert from 'assert';

describe('EntityExtractor', () => {
  it('should extract entities from text', async () => {
    const extractor = new EntityExtractor();
    const text = '张三是谷歌的工程师';
    const result = await extractor.extract(text);

    assert(result.entities.length > 0);
    assert(result.entities.some(e => e.name === '张三'));
    assert(result.entities.some(e => e.name === '谷歌'));
  });
});
```

#### 集成测试 (Integration Tests)
- **目标**: 验证模块间协作
- **工具**: Mocha + Chai
- **覆盖率**: > 70%

```javascript
// test/integration/pipeline.test.mjs
import { Pipeline } from '../../src/index.mjs';
import assert from 'assert';

describe('Pipeline', () => {
  it('should build index and query', async () => {
    const pipeline = new Pipeline();
    await pipeline.buildIndex('data/test.md', 'data/index.json');
    const results = await pipeline.query('查询内容');

    assert(results.length > 0);
    assert(results.every(r => r.score > 0));
  });
});
```

#### 性能测试 (Benchmarks)
- **目标**: 验证性能指标
- **工具**: `benchmark` 库
- **指标**: 响应时间、吞吐量、内存占用

```javascript
// test/benchmarks/query_performance.mjs
import Benchmark from 'benchmark';
import { HybridQueryEngine } from '../../src/core/hybrid_query.mjs';

const suite = new Benchmark.Suite();

const engine = new HybridQueryEngine('data/index.json');

suite
  .add('Query', async (deferred) => {
    await engine.query('测试查询');
    deferred.resolve();
  })
  .on('cycle', (event) => {
    console.log(String(event.target));
  })
  .run({ async: true });
```

#### 召回率测试 (Recall Tests)
- **目标**: 验证召回率和多样性
- **工具**: 自定义评估脚本
- **指标**: Recall@K, Diversity@K

```javascript
// test/benchmarks/recall.test.mjs
import { evaluateRecall } from '../utils/evaluation.mjs';

const results = await evaluateRecall({
  queries: testQueries,
  groundTruth: groundTruth,
  engine: hybridEngine
});

console.log(`Recall@10: ${results.recall10}`);
console.log(`Diversity@10: ${results.diversity10}`);
```

---

### 4.3 测试执行计划

#### Phase 1: 单元测试 (每周)
- 每完成一个模块，立即编写单元测试
- 使用 `npm run test:unit` 执行

#### Phase 2: 集成测试 (每 2 周)
- 每完成 2 个模块，编写集成测试
- 使用 `npm run test:integration` 执行

#### Phase 3: 性能测试 (Phase 5 结束)
- 所有功能完成后，进行性能测试
- 使用 `npm run test:benchmark` 执行

#### Phase 4: 召回率测试 (Phase 5 结束)
- 使用标准数据集进行召回率测试
- 生成测试报告

---

## 五、验收标准

### 5.1 功能验收

- [ ] 实体提取准确率 > 90%
- [ ] 关系识别准确率 > 80%
- [ ] 社区检测合理（人工评估）
- [ ] 摘要生成准确（人工评估）
- [ ] 混合检索召回率 > 80%
- [ ] 混合检索多样性 > 75%

### 5.2 性能验收

- [ ] 索引时间 < 5 分钟 (100 文档)
- [ ] 查询时间 < 100 ms
- [ ] 内存占用 < 100 MB
- [ ] 并发查询支持 > 10 QPS

### 5.3 质量验收

- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试覆盖率 > 70%
- [ ] 无严重 Bug
- [ ] 代码风格一致 (ESLint)
- [ ] 文档完整

---

## 六、风险管理

### 6.1 技术风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| LLM 准确度不足 | 中 | 高 | 优化 prompt，后处理规则 |
| 社区检测质量差 | 中 | 中 | 多参数测试，人工校正 |
| 性能不达标 | 低 | 高 | 性能分析，算法优化 |
| 依赖库不稳定 | 低 | 中 | 版本锁定，备选方案 |

### 6.2 进度风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 开发延期 | 中 | 高 | MVP 优先，分阶段交付 |
| 测试数据不足 | 低 | 中 | 多数据源准备 |
| LLM 服务不稳定 | 中 | 中 | Mock LLM，降级方案 |

---

## 七、时间线

| 阶段 | 任务 | 预计时间 | 负责人 |
|------|------|----------|--------|
| Week 1 | 基础设施搭建 | 7 天 | 耗电马喽 |
| Week 2 | 实体关系提取 | 7 天 | 耗电马喽 |
| Week 3 | 社区检测 | 7 天 | 耗电马喽 |
| Week 4 | 社区摘要 | 7 天 | 耗电马喽 |
| Week 5 | 混合检索 | 7 天 | 耗电马喽 |
| Week 6 | 测试与优化 | 7 天 | 耗电马喽 |

**总计**: 6 周 (42 天)

---

## 八、技术栈

### 核心依赖
```json
{
  "dependencies": {
    "graphology": "^0.25.4",
    "graphology-communities-leiden": "^2.0.1",
    "@lmstudio/sdk": "^1.0.0"
  },
  "devDependencies": {
    "mocha": "^10.0.0",
    "chai": "^4.3.0",
    "benchmark": "^2.1.4",
    "eslint": "^8.0.0"
  }
}
```

### 开发工具
- **运行时**: Node.js v25.5.0
- **包管理**: npm
- **代码规范**: ESLint + Prettier
- **测试框架**: Mocha + Chai
- **版本控制**: Git

---

## 九、下一步行动

### 立即执行
1. ✅ 创建项目说明书 (本文档)
2. ⏭️ 重构目录结构
3. ⏭️ 安装依赖
4. ⏭️ 实现 LLM 客户端

### 本周目标
- [ ] 完成 Phase 1: 基础设施搭建
- [ ] 编写实体关系提取器
- [ ] 编写单元测试

### 下周目标
- [ ] 完成实体关系提取器
- [ ] 实现社区检测器
- [ ] 编写集成测试

---

## 十、参考资料

1. **GraphRAG 论文**: https://arxiv.org/abs/2404.16130
2. **GraphRAG 官方**: https://github.com/microsoft/graphrag
3. **Leiden 算法**: https://arxiv.org/abs/1810.08473
4. **graphology 文档**: https://graphology.github.io/
5. **MS MARCO**: https://microsoft.github.io/msmarco/
6. **HotpotQA**: https://hotpotqa.github.io/

---

**文档版本**: v1.0
**最后更新**: 2026-03-12
**作者**: 耗电马喽 🐎⚡
**状态**: ✅ 已完成

---

## 附录

### A. 环境变量配置

```bash
# .env
LLM_BASE_URL=http://localhost:1234
LLM_MODEL=qwen3.5-35b-a3b
LOG_LEVEL=debug
```

### B. 配置文件示例

```json
// config.json
{
  "llm": {
    "baseURL": "http://localhost:1234",
    "model": "qwen3.5-35b-a3b",
    "temperature": 0.3,
    "maxTokens": 2000
  },
  "communityDetection": {
    "algorithm": "leiden",
    "resolution": 1.0,
    "maxLevels": 3
  },
  "query": {
    "topK": 10,
    "minScore": 0.3,
    "weights": {
      "title": 0.4,
      "entity": 0.3,
      "community": 0.3
    }
  }
}
```

### C. 数据集格式示例

```json
{
  "query": "什么是 GraphRAG？",
  "relevant_nodes": [
    {"node_id": "1", "relevance": 1.0},
    {"node_id": "5", "relevance": 0.8}
  ],
  "expected_answer": "GraphRAG 是微软提出的基于知识图谱的 RAG 方法..."
}
```

---

*项目说明书完成！准备开始实现！* 🚀