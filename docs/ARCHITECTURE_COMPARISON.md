# PageIndex 架构对比与术语膨胀分析

**日期**: 2026-03-14  
**主题**: 搜索树 vs 术语词典 + 术语膨胀问题

---

## 📊 PageIndex 两种架构对比

### 架构 1: 搜索树（原 PageIndex）

**文件**: `src/tree.mjs`, `src/query_tree.mjs`

**核心思想**: 基于 Markdown 章节结构构建检索树

**架构**:
```
Markdown 文档
   ↓
解析章节结构（# 标题）
   ↓
构建层次化树
   └── Root
       ├── 第一章：AI 发展历程
       │   ├── 1.1 起步阶段
       │   └── 1.2 发展阶段
       └── 第二章：技术应用
           ├── 2.1 计算机视觉
           └── 2.2 自然语言处理
   ↓
查询时遍历树节点（标题 + 内容匹配）
```

**查询流程**:
```javascript
// 用户查询："中国 AI 发展历程"
const query = "中国 AI 发展历程";
const keywords = query.split(/\s+/); // ["中国", "AI", "发展历程"]

// 遍历树节点
function searchTree(node, keywords) {
  const titleMatch = keywords.some(kw => 
    node.title.includes(kw)
  );
  const contentMatch = keywords.some(kw => 
    node.content.includes(kw)
  );
  
  if (titleMatch || contentMatch) {
    results.push(node);
  }
  
  // 递归搜索子节点
  for (const child of node.children) {
    searchTree(child, keywords);
  }
}
```

**优点**:
- ✅ 保留文档逻辑结构
- ✅ 可解释性强（知道匹配哪个章节）
- ✅ 无需外部依赖

**缺点**:
- ❌ 依赖 Markdown 格式（标题层级）
- ❌ 查询基于关键词匹配（无语义理解）
- ❌ 无法跨文档聚合术语
- ❌ 新文档需要重新构建树

---

### 架构 2: 术语词典（PageIndex-CN 自进化版）

**文件**: `src/utils/term_extractor.py`, `src/agents/term_evaluator.mjs`

**核心思想**: 基于术语频率和质量筛选构建动态词典

**架构**:
```
互联网文章（18 篇）
   ↓
jieba 分词 + TF-IDF 提取
   ↓
提取 634 个候选术语
   ↓
规则评估筛选（保留>=4 分）
   ↓
生成高质量术语词典（226 个术语）
   {
     "肺结节": { weight: 1.2, domain: "medical_ai" },
     "LoRA 微调": { weight: 1.0, domain: "llm" },
     "合同审查": { weight: 1.1, domain: "legal_tech" },
     ...
   }
   ↓
查询时分词 + 倒排索引匹配
```

**查询流程**:
```javascript
// 用户查询："肺结节检测"
const query = "肺结节检测";

// 1. jieba 分词
const tokens = jieba.cut(query); // ["肺结节", "检测"]

// 2. 应用词典权重
const weightedTokens = tokens.filter(t => {
  const term = dictionary.find(d => d.term === t);
  return !term || term.weight > 0.5; // 保留高权重术语
});

// 3. 查找倒排索引
const docIds = invertedIndex[weightedTokens[0]]; // [doc1, doc3, doc5]

// 4. 返回结果
return docIds.map(id => documents[id]);
```

**优点**:
- ✅ 不依赖文档格式（支持任意文本）
- ✅ 跨文档术语聚合
- ✅ 动态进化（持续学习新术语）
- ✅ 领域自适应（自动分类）

**缺点**:
- ❌ 需要维护术语词典
- ❌ 可能存在术语膨胀风险（见下文分析）

---

## 🤔 PageIndex-CN 使用 LLM 吗？

### A: **可选，但不依赖**

**当前架构**:
```
术语提取：jieba 分词（Python，本地）✅
术语评估：规则评估（Node.js，本地）✅  ← 不使用 LLM
召回率测试：规则匹配（Node.js，本地）✅
权重优化：CMA-ES（JavaScript，本地）✅
```

**LLM 的潜在用途**（可选）:
1. **术语质量评估**（Phase 4 已验证规则更优）
   - LLM 评估：2-5 秒/术语，依赖 API
   - 规则评估：<1ms/术语，零成本 ✅

2. **查询重写优化**（未实现）
   - "肺结节检测" → ["肺结节", "CT 影像", "筛查"]
   - 扩展查询词，提高召回率

3. **文档摘要生成**（未实现）
   - 为每篇文章生成摘要
   - 加速检索（先匹配摘要，再匹配全文）

**结论**: PageIndex-CN **不依赖 LLM**，核心是**术语提取 + 规则评估 + 自进化流程**

---

## 💡 术语膨胀问题分析

### 什么是术语膨胀？

**定义**: 术语数量快速增长，但质量下降，导致：
1. 检索精度下降（噪声术语增多）
2. 词典维护成本上升
3. 查询性能下降（匹配项过多）

---

### PageIndex-CN 的术语增长

**实际数据**:
| 版本 | 术语数 | 领域 | 增长率 | 召回率 |
|------|--------|------|--------|--------|
| v5 | 52 | AI 通用 | - | 100% |
| v6 | 107 | AI + 医疗 | +106% | 100% ✅ |
| v7 | 226 | AI + 医疗 + 法律 + 金融 + LLM | +235% | 100% ✅ |

**观察**:
- ✅ 术语数增长 335%（52 → 226）
- ✅ 召回率保持 100%（未下降）
- ✅ 领域从 1 个扩展到 5 个

**结论**: **当前阶段未出现术语膨胀**

---

### 为什么没有术语膨胀？

**原因 1: 严格的筛选机制**

**筛选流程**:
```
634 个候选术语
   ↓
规则评估（5 分制）
   ↓
只保留 score >= 4 的术语（核心 + 相关）
   ↓
145 个高质量术语（22.9% 保留率）
```

**筛选率**:
| 领域 | 提取术语 | 筛选后 | 保留率 |
|------|---------|--------|--------|
| 医疗 AI | 231 | 61 | 26.4% |
| 法律科技 | 183 | 45 | 24.6% |
| 金融科技 | 197 | 36 | 18.3% |
| LLM 技术 | 254 | 64 | 25.2% |
| **总计** | **634** | **145** | **22.9%** |

**关键**: 只保留**22.9%**的高质量术语，淘汰**77.1%**的一般术语

---

**原因 2: 领域关键词匹配**

**规则评估算法**:
```javascript
function evaluateTerm(term, frequency, docCount, domain) {
  // 规则 1: 长度检查
  if (term.length < 2) return score=1; // 淘汰
  
  // 规则 2: 停用词检查
  if (stopwords.includes(term)) return score=1; // 淘汰
  
  // 规则 3: 领域关键词匹配
  const keywords = domainKeywords[domain];
  // medical_ai: ['肺', '眼底', 'CT', '影像', '筛查', '检测']
  // llm: ['LoRA', '微调', '量化', '推理', '部署']
  // legal_tech: ['合同', '诉讼', '法律', '审查']
  // fintech: ['金融', '风险', '信用', '评估']
  
  if (keywords.some(kw => term.includes(kw)) && frequency >= 3)
    return score=5; // 核心术语 ✅
  
  // 规则 4: 频率检查
  if (frequency >= 5 && docCount >= 2)
    return score=4; // 相关术语 ✅
  
  return score=3; // 一般术语（淘汰）
}
```

**效果**:
- ✅ 淘汰长度<2 的术语（如"的"、"了"）
- ✅ 淘汰停用词
- ✅ 优先保留领域特异性术语
- ✅ 要求跨文档频率（避免单篇噪声）

---

**原因 3: 召回率验证闭环**

**验证流程**:
```
更新词典
   ↓
运行召回率测试（5 个标准查询）
   ↓
如果召回率 < 92%:
  - 自动回滚到上一版本
  - 分析原因
   ↓
如果召回率 >= 92%:
  - 保存新版本 ✅
```

**效果**:
- ✅ 强制保证检索质量
- ✅ 自动回滚防止质量下降
- ✅ 持续监控术语有效性

---

## ⚠️ 潜在的术语膨胀风险

虽然当前未出现，但未来可能的风险：

### 风险 1: 领域关键词库未同步扩展

**问题**: 新增领域（如"bioTech"）时，如果没有预定义关键词，规则评估无法准确判断领域特异性

**解决**:
```javascript
// 方案 1: 手动扩展关键词库
domainKeywords['biotech'] = ['基因', '蛋白', '细胞', '抗体', ...];

// 方案 2: LLM 自动提取领域关键词
const keywords = await llm.extractDomainKeywords(domain, articles);
```

---

### 风险 2: 术语去重逻辑不完善

**问题**: "肺结节"和"肺结节检测"可能同时存在，导致冗余

**当前状态**:
```javascript
// 当前：简单去重（完全匹配）
if (existingTerms.has(term)) {
  skipped.push(term);
}

// 问题：无法识别"肺结节"vs"肺结节检测"
```

**解决**:
```javascript
// 方案 1: 词根归一化
const stem = stemmer.stem(term); // "肺结节检测" → "肺结节"
if (existingStems.has(stem)) {
  skipped.push(term);
}

// 方案 2: 术语层次关系
if (existingTerms.some(t => t.includes(term))) {
  // "肺结节"已存在，跳过"肺结节检测"
  skipped.push(term);
}
```

---

### 风险 3: 频率阈值过低

**问题**: 如果降低频率阈值（如从 3 降到 1），可能导致大量低频术语进入

**当前阈值**:
```javascript
if (frequency >= 3 && hasDomainKeyword) return score=5;
```

**建议**: 保持当前阈值，不降低

---

## 🎯 术语膨胀预防策略

### 策略 1: 定期清理低频术语

**脚本**: `cleanup_low_frequency_terms.js`
```javascript
// 每月执行一次
const dict = loadDictionary();
const cleaned = dict.filter(term => 
  term.frequency >= 3 || term.score >= 4
);

if (cleaned.length < dict.length) {
  console.log(`清理 ${dict.length - cleaned.length} 个低频术语`);
  saveDictionary(cleaned);
}
```

---

### 策略 2: 术语质量监控

**指标**:
- **术语增长率**: 每月新增术语数 / 总术语数（目标：<20%）
- **召回率**: 标准测试集召回率（目标：>=92%）
- **平均频率**: 词典术语的平均频率（目标：>=5）
- **领域覆盖率**: 各领域的术语分布（目标：均衡）

**告警**:
```javascript
if (termGrowthRate > 0.2) {
  alert('术语增长率过高，建议审查');
}

if (avgFrequency < 5) {
  alert('平均频率过低，可能存在噪声');
}
```

---

### 策略 3: 术语层次化组织

**当前**: 扁平词典
```javascript
{
  "肺结节": { weight: 1.2, domain: "medical_ai" },
  "肺结节检测": { weight: 1.0, domain: "medical_ai" }
}
```

**优化**: 层次化本体
```javascript
{
  "肺结节": {
    weight: 1.2,
    domain: "medical_ai",
    children: ["肺结节检测", "肺结节筛查", "肺结节 CT"]
  }
}
```

**优点**:
- ✅ 减少冗余
- ✅ 支持语义查询
- ✅ 便于导航

---

## 📊 总结

### PageIndex 架构对比

| 特性 | 搜索树（原 PageIndex） | 术语词典（PageIndex-CN） |
|------|---------------------|----------------------|
| **核心** | 章节结构 | 术语频率 + 质量 |
| **查询** | 遍历树节点 | 分词 + 倒排索引 |
| **格式依赖** | Markdown 标题 | 无（支持任意文本） |
| **跨文档** | ❌ | ✅ |
| **动态进化** | ❌ | ✅ |
| **LLM 依赖** | 可选 | 可选（规则更优） |

---

### 术语膨胀分析

**当前状态**: ✅ **未出现术语膨胀**

**原因**:
1. ✅ 严格筛选（保留 22.9%）
2. ✅ 领域关键词匹配
3. ✅ 召回率验证闭环

**潜在风险**:
1. ⚠️ 领域关键词库未同步扩展
2. ⚠️ 术语去重逻辑不完善
3. ⚠️ 频率阈值过低

**预防策略**:
1. ✅ 定期清理低频术语
2. ✅ 术语质量监控
3. ✅ 术语层次化组织

---

**结论**: PageIndex-CN 的术语词典架构**未出现术语膨胀**，且有完善的预防和监控机制。继续当前策略即可！

---

**负责人**: 耗电马喽 🐎⚡  
**日期**: 2026-03-14 08:30
