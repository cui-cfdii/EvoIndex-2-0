# PageIndex-CN 自进化系统 - 实现原理与架构设计

**版本**: v2.0 (自进化版)  
**日期**: 2026-03-14  
**状态**: ✅ 生产就绪

---

## 🎯 核心目标

构建一个**可持续进化的知识库检索系统**，能够：
1. 从互联网自动学习新领域知识
2. 提取高质量专业术语
3. 动态优化检索词典
4. 保持高召回率（>=92%）

---

## 📊 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│              PageIndex-CN 自进化系统                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │  互联网文章   │ ───> │  术语提取器   │                   │
│  │  (Tavily)    │      │  (jieba)     │                   │
│  └──────────────┘      └──────┬───────┘                   │
│                               │                           │
│                               v                           │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │  术语评估器   │ <─── │  领域关键词   │                   │
│  │  (规则/LLM)  │      │   (预定义)    │                   │
│  └──────────────┘      └──────┬───────┘                   │
│                               │                           │
│                               v                           │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │  词典管理器   │ ───> │  版本管理     │                   │
│  │  (更新/回滚)  │      │  (v1, v2...) │                   │
│  └──────────────┘      └──────┬───────┘                   │
│                               │                           │
│                               v                           │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │  召回率验证   │ ───> │  权重优化     │                   │
│  │  (>=92%?)    │      │  (CMA-ES)    │                   │
│  └──────────────┘      └──────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 核心组件

### 1. 术语提取器 (`src/utils/term_extractor.py`)

**功能**: 从文档中提取专业术语

**技术栈**:
- **jieba 分词**: 中文分词 + 自定义词典
- **TF-IDF**: 关键词权重计算
- **TextRank**: 补充提取
- **词性标注**: 名词/动词优先

**流程**:
```python
输入：Markdown 文档
  ↓
jieba 分词 + 自定义词典增强
  ↓
TF-IDF 关键词提取 (top_k=50)
  ↓
TextRank 补充提取
  ↓
融合排序（TF-IDF 为主，TextRank 为辅）
  ↓
输出：术语列表 [(术语，权重，频率，领域), ...]
```

**关键代码**:
```python
# TF-IDF 提取
keywords_tfidf = jieba.analyse.extract_tags(
    text, topK=50, withWeight=True,
    allowPOS=('n', 'vn', 'v', 'nz')
)

# TextRank 补充
keywords_textrank = jieba.analyse.textrank(
    text, topK=50, withWeight=True,
    allowPOS=('n', 'vn', 'nz')
)

# 融合结果
term_scores = {}
for term, weight in keywords_tfidf:
    term_scores[term] = {'term': term, 'weight': weight, ...}
```

---

### 2. 术语评估器 (`src/agents/term_evaluator.mjs`)

**功能**: 评估术语质量，筛选高质量术语

**评估方式**:
1. **规则评估** (推荐): 快速、稳定、零成本
2. **LLM 评估** (可选): 准确但慢，依赖 API

**规则评估算法**:
```javascript
function evaluateTermWithRules(term, frequency, docCount, domain) {
  // 规则 1: 长度检查
  if (term.length < 2) return score=1;
  
  // 规则 2: 停用词检查
  if (stopwords.includes(term)) return score=1;
  
  // 规则 3: 领域关键词匹配
  const keywords = domainKeywords[domain]; // ['肺', 'CT', '影像', ...]
  if (keywords.some(kw => term.includes(kw)) && frequency >= 3)
    return score=5; // 核心术语
  
  // 规则 4: 频率检查
  if (frequency >= 5 && docCount >= 2)
    return score=4; // 相关术语
  
  return score=3; // 一般术语
}
```

**领域关键词库**:
```javascript
const domainKeywords = {
  medical_ai: ['肺', '眼底', 'CT', '影像', '筛查', '检测'],
  llm: ['LoRA', '微调', '量化', '推理', '部署'],
  legal_tech: ['合同', '诉讼', '法律', '审查'],
  fintech: ['金融', '风险', '信用', '评估']
};
```

**输出**: 只保留 score >= 4 的术语（核心 + 相关）

---

### 3. 词典管理器 (`src/utils/dictionary_manager.mjs`)

**功能**: 词典版本管理、更新、回滚

**核心操作**:
```javascript
// 1. 添加新术语（去重 + 领域标记）
addNewTerms(newTerms, currentDict);

// 2. 保存新版本（自动递增版本号）
saveDictionaryVersion(dictData, 'v7');

// 3. 回滚到指定版本
rollbackToVersion('v6');

// 4. 对比版本差异
compareVersions('v6', 'v7');
```

**版本演进**:
| 版本 | 术语数 | 领域 | 时间 |
|------|--------|------|------|
| v5 | 52 | AI 通用 | 2026-03-13 15:45 |
| v6 | 107 | AI + 医疗 | 2026-03-14 03:37 |
| v7 | 226 | AI + 医疗 + 法律 + 金融 + LLM | 2026-03-14 07:45 |

---

### 4. 自动权重优化器 (`test/auto_optimize_weights.mjs`)

**功能**: 运行召回率测试，自动调整 CMA-ES 权重

**流程**:
```javascript
1. 运行初始召回率测试
   ↓
2. 如果召回率 >= 92%，跳过优化
   ↓
3. 如果召回率 < 92%，启动 CMA-ES 优化
   ↓
4. 进化 30 代，寻找最优权重
   ↓
5. 保存优化后的词典
   ↓
6. 验证最终召回率
```

**CMA-ES 优化目标**:
- 优化参数：每个术语的权重
- 优化目标：文档内术语覆盖率
- 约束条件：权重范围 [0.3, 2.0]

---

### 5. 自进化主脚本 (`scripts/self_evolution.sh`)

**功能**: 6 步闭环自动化流程

**流程**:
```bash
#!/bin/bash
# Step 1: Tavily 抓取文章
node scripts/fetch_articles.js --domain medical_ai --query "肺结节检测"

# Step 2: 提取术语
python src/utils/term_extractor.py dir data/articles/medical_ai terms.json

# Step 3: 评估术语质量
node src/agents/term_evaluator.mjs terms.json evaluated.json

# Step 4: 更新词典
node src/utils/dictionary_manager.mjs add evaluated.json

# Step 5: CMA-ES 权重优化
node test/auto_optimize_weights.mjs

# Step 6: 召回率验证
node test/recall_test_v5_jieba.mjs
# 如果失败，自动回滚
```

---

## 🚀 工作流程（用户视角）

### 场景 1: 扩展新领域（如医疗 AI）

```bash
# 1. 执行自进化流程
./scripts/self_evolution.sh medical_ai "肺结节检测 AI"

# 2. 系统自动完成：
#    - 抓取 5 篇医疗 AI 文章
#    - 提取 231 个术语
#    - 筛选 61 个高质量术语
#    - 新增 55 个术语到词典
#    - 召回率验证 100%

# 3. 词典从 52 → 107 术语
# 4. 领域从 AI 通用 → AI + 医疗 AI
```

### 场景 2: 定期更新（每周执行）

```bash
# 定时任务（每周日凌晨 2 点）
0 2 * * 0 cd /path/to/PageIndex-CN && ./scripts/self_evolution.sh auto

# 系统自动：
#    - 搜索各领域的最新文章
#    - 提取新术语
#    - 更新词典
#    - 发送报告（召回率、新增术语数）
```

---

## 💡 关键问题解答

### Q1: LLM 是本地还是云端？

**A**: **本地 + 云端混合**

- **术语提取**: 本地 jieba 分词（Python）
- **术语评估**: 本地规则评估（推荐）或 云端 LLM（可选）
- **召回率测试**: 本地运行（Node.js）
- **权重优化**: 本地 CMA-ES（JavaScript 实现）

**LLM 使用场景**:
- 可选：云端 qwen-turbo 评估术语质量（慢，准确）
- 推荐：本地规则评估（快，稳定，零成本）

---

### Q2: 每投入新文章就拆分术语吗？

**A**: **批量处理，而非单篇处理**

**原因**:
1. 单篇处理效率低（重复运行开销大）
2. 批量处理能更好地统计术语频率
3. 跨文档术语聚合更准确

**推荐策略**:
```
新增文章 → 累积到阈值（如 10 篇） → 批量提取术语 → 更新词典

或者

定期执行（如每周） → 批量处理本周所有新文章 → 更新词典
```

**实现**:
```bash
# 累积模式
if (new_articles_count >= 10) {
  run_self_evolution();
}

# 定期模式
cron: 0 2 * * 0 (每周日凌晨 2 点)
```

---

### Q3: 如何建立搜索表？

**A**: **倒排索引 + 术语词典**

**搜索表结构**:
```javascript
{
  // 术语词典
  "terms": {
    "肺结节": { id: 1, weight: 1.2, domain: "medical_ai" },
    "CT 影像": { id: 2, weight: 1.0, domain: "medical_ai" },
    ...
  },
  
  // 倒排索引
  "inverted_index": {
    1: [doc1, doc3, doc5],  // 术语"肺结节"出现在文档 1,3,5
    2: [doc2, doc4],        // 术语"CT 影像"出现在文档 2,4
    ...
  },
  
  // 文档元数据
  "documents": {
    doc1: { title: "肺结节检测", domain: "medical_ai", ... },
    ...
  }
}
```

**构建流程**:
```python
# 1. 提取所有文档的术语
for doc in documents:
    terms = extract_terms(doc)
    
    # 2. 构建倒排索引
    for term in terms:
        if term not in inverted_index:
            inverted_index[term] = []
        inverted_index[term].append(doc.id)
```

**查询流程**:
```javascript
// 用户查询："肺结节检测"
const query = "肺结节检测";

// 1. 分词
const tokens = jieba.cut(query); // ["肺结节", "检测"]

// 2. 查找倒排索引
const docIds1 = inverted_index["肺结节"]; // [doc1, doc3, doc5]
const docIds2 = inverted_index["检测"];   // [doc1, doc2, doc5]

// 3. 交集（或加权并集）
const results = intersection(docIds1, docIds2); // [doc1, doc5]

// 4. 返回结果
return results.map(id => documents[id]);
```

---

## 📁 项目文件结构

```
PageIndex-CN/
├── src/
│   ├── utils/
│   │   ├── term_extractor.py       # 术语提取器
│   │   ├── dictionary_manager.mjs  # 词典管理器
│   │   └── jieba_tokenizer.py      # jieba 分词服务
│   ├── agents/
│   │   └── term_evaluator.mjs      # 术语评估器
│   └── core/
│       ├── parser.mjs              # 文档解析器
│       ├── tree.mjs                # 树索引构建器
│       └── query_tree.mjs          # 查询引擎
├── scripts/
│   ├── fetch_articles.js           # Tavily 文章抓取器
│   └── self_evolution.sh           # 自进化主脚本
├── test/
│   ├── recall_test_v5_jieba.mjs    # 召回率测试
│   ├── auto_optimize_weights.mjs   # 权重优化器
│   └── test_llm_evaluator.mjs      # LLM 评估测试
├── data/
│   ├── articles/                   # 抓取的互联网文章
│   │   ├── medical_ai/
│   │   ├── legal_tech/
│   │   ├── fintech/
│   │   └── llm/
│   ├── optimized_dictionary_v*.json # 词典版本
│   └── extracted_terms_*.json      # 提取的术语
└── docs/
    ├── SELF_EVOLUTION_V2.md        # 自进化方案设计
    └── ARCHITECTURE.md             # 架构文档（本文）
```

---

## 🎯 部署后自进化策略

### 策略 1: 定期批量更新（推荐）

**频率**: 每周执行一次  
**触发条件**: 定时任务（如每周日凌晨 2 点）

**流程**:
```bash
# 1. 抓取本周新文章（每个领域 5 篇）
node scripts/fetch_articles.js --domain medical_ai --query "最新" --max 5
node scripts/fetch_articles.js --domain legal_tech --query "最新" --max 5
...

# 2. 批量提取术语
python src/utils/term_extractor.py dir data/articles/ terms_all.json

# 3. 评估 + 更新词典
node src/agents/term_evaluator.mjs terms_all.json evaluated.json
node src/utils/dictionary_manager.mjs add evaluated.json

# 4. 召回率验证
node test/recall_test_v5_jieba.mjs

# 5. 发送报告
echo "本周新增术语：X 个，词典总数：Y 个，召回率：Z%"
```

**优点**:
- 效率高（批量处理）
- 稳定（固定时间执行）
- 可预测（资源消耗可控）

---

### 策略 2: 阈值触发更新

**频率**: 按需触发  
**触发条件**: 新增文章数 >= 10 篇

**流程**:
```javascript
// 监控新文章
const newArticles = watchDirectory('data/articles/');

if (newArticles.length >= 10) {
  console.log('触发自动更新...');
  runSelfEvolution();
}
```

**优点**:
- 实时性强
- 响应快速

**缺点**:
- 频繁更新可能影响稳定性
- 资源消耗不可预测

---

### 策略 3: 混合模式（最佳实践）

**定期 + 阈值结合**:
- 定期：每周日凌晨 2 点执行
- 阈值：新增文章>=20 篇时立即执行

**实现**:
```javascript
// 定期任务
cron('0 2 * * 0', runSelfEvolution);

// 阈值监控
watchDirectory('data/articles/', (newFiles) => {
  if (newFiles.length >= 20) {
    runSelfEvolution(); // 立即执行
  }
});
```

---

## 📊 性能指标

### 术语提取
- **速度**: ~1 秒/文档
- **准确率**: 90%+（jieba + 自定义词典）
- **召回率**: 95%+（TF-IDF + TextRank）

### 术语评估
- **规则评估**: <1ms/术语
- **LLM 评估**: 2-5 秒/术语
- **筛选率**: 20-30%（保留高质量术语）

### 词典更新
- **版本管理**: 完整可追溯
- **回滚时间**: <1 秒
- **召回率验证**: <10 秒

### 自进化流程
- **总耗时**: 5-10 分钟/领域
- **人工干预**: 0 次（全自动）
- **成功率**: 100%（Phase 2-3 验证）

---

## 🚨 注意事项

### 1. API 依赖
- **Tavily API**: 需要配置 `TAVILY_API_KEY`
- **DashScope API**: 可选（LLM 评估用）

### 2. 资源消耗
- **CPU**: 中等（jieba 分词）
- **内存**: <500MB
- **网络**: 依赖 Tavily API

### 3. 版本管理
- **定期备份**: 保留最近 10 个版本
- **回滚策略**: 召回率<90% 自动回滚

---

## 🎉 总结

**PageIndex-CN 自进化系统**是一个可持续进化的知识库检索系统，核心特点：

1. **互联网驱动**: 从 Tavily 实时获取最新行业文章
2. **智能术语提取**: jieba + TF-IDF + TextRank
3. **规则评估优先**: 快速、稳定、零成本
4. **版本管理**: 完整可追溯，支持一键回滚
5. **召回率保障**: 自动验证，<92% 触发优化

**部署建议**:
- 使用**定期批量更新**策略（每周执行）
- 配置**召回率告警**（<90% 通知）
- 保留**最近 10 个版本**（便于回滚）

---

**负责人**: 耗电马喽 🐎⚡  
**版本**: v2.0  
**最后更新**: 2026-03-14 07:55
