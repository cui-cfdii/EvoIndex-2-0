# 术语图（Term Graph）设计方案

**版本**: v1.0  
**日期**: 2026-03-14  
**状态**: 📝 设计方案

---

## 🎯 目标

通过构建术语之间的语义关系图，加速搜索意图理解，提升召回率和准确率。

---

## 📊 当前架构 vs 术语图架构

### 当前架构：扁平词典

```javascript
{
  "肺结节": { weight: 1.2, domain: "medical_ai" },
  "CT 影像": { weight: 1.0, domain: "medical_ai" },
  "筛查": { weight: 0.9, domain: "medical_ai" },
  "检测": { weight: 0.9, domain: "medical_ai" }
}
```

**查询**: "肺结节检测"
```
分词 → ["肺结节", "检测"]
   ↓
查找倒排索引 → [doc1, doc3, doc5]
   ↓
返回结果
```

**问题**:
- ❌ 无法识别"肺结节"和"CT 影像"的关联
- ❌ 无法理解"筛查"和"检测"的近义关系
- ❌ 查询词必须精确匹配术语

---

### 术语图架构：语义网络

```javascript
{
  "nodes": [
    { id: "肺结节", weight: 1.2, domain: "medical_ai" },
    { id: "CT 影像", weight: 1.0, domain: "medical_ai" },
    { id: "筛查", weight: 0.9, domain: "medical_ai" },
    { id: "检测", weight: 0.9, domain: "medical_ai" },
    { id: "肺癌", weight: 1.1, domain: "medical_ai" }
  ],
  "edges": [
    { source: "肺结节", target: "CT 影像", relation: "requires", weight: 0.9 },
    { source: "肺结节", target: "筛查", relation: "hyponym", weight: 0.8 },
    { source: "肺结节", target: "检测", relation: "hyponym", weight: 0.8 },
    { source: "肺结节", target: "肺癌", relation: "related_to", weight: 0.7 },
    { source: "筛查", target: "检测", relation: "synonym", weight: 0.95 }
  ]
}
```

**可视化**:
```
肺结节 (1.2)
  ├──[requires]──> CT 影像 (1.0)
  ├──[hyponym]──> 筛查 (0.9)
  ├──[hyponym]──> 检测 (0.9)
  └──[related_to]──> 肺癌 (1.1)
  
筛查 (0.9) ──[synonym]──> 检测 (0.9)
```

**查询**: "肺结节检测"
```
分词 → ["肺结节", "检测"]
   ↓
查找术语图
   ↓
扩展相关术语：["肺结节", "检测", "CT 影像", "筛查"]  ← 新增！
   ↓
查找倒排索引 → [doc1, doc2, doc3, doc5]  ← 更多结果
   ↓
返回结果（排序优化）
```

**优势**:
- ✅ 识别术语关联（"肺结节"→"CT 影像"）
- ✅ 识别近义词（"筛查"≈"检测"）
- ✅ 查询扩展，提升召回率
- ✅ 语义排序，提升准确率

---

## 🏗️ 术语图构建方案

### 方案 1: 基于共现关系统计（推荐）

**原理**: 在同一文档中频繁共现的术语，可能存在语义关联

**算法**:
```python
# 1. 统计术语共现矩阵
cooccurrence_matrix = {}
for doc in documents:
    terms = extract_terms(doc)
    for i, term1 in enumerate(terms):
        for term2 in terms[i+1:]:
            key = tuple(sorted([term1, term2]))
            cooccurrence_matrix[key] = cooccurrence_matrix.get(key, 0) + 1

# 2. 计算关联强度（PMI 或 Jaccard）
def pmi(term1, term2, cooccur_count, total_docs):
    p_term1 = freq[term1] / total_docs
    p_term2 = freq[term2] / total_docs
    p_cooccur = cooccur_count / total_docs
    return log(p_cooccur / (p_term1 * p_term2))

# 3. 构建图
edges = []
for (term1, term2), count in cooccurrence_matrix.items():
    if count >= 3:  # 阈值
        pmi_score = pmi(term1, term2, count, len(documents))
        if pmi_score > 2.0:  # 阈值
            edges.append({
                'source': term1,
                'target': term2,
                'relation': 'cooccur',
                'weight': min(1.0, pmi_score / 5.0)
            })
```

**优点**:
- ✅ 自动学习，无需人工标注
- ✅ 领域自适应
- ✅ 计算简单，易于实现

**缺点**:
- ❌ 无法区分关系类型（需要后处理）
- ❌ 依赖文档质量

---

### 方案 2: 基于 LLM 的关系提取

**原理**: 使用 LLM 分析术语对之间的语义关系

**算法**:
```python
# 候选术语对（共现频率高的）
candidate_pairs = [
    ("肺结节", "CT 影像"),
    ("肺结节", "筛查"),
    ("筛查", "检测"),
    ...
]

# LLM 提取关系
def extract_relation(term1, term2, context):
    prompt = f"""
分析以下两个术语的语义关系：
术语 1: {term1}
术语 2: {term2}
上下文：{context}

关系类型：
- synonym: 近义词（如"筛查"≈"检测"）
- hyponym: 上下位（如"肺结节"是"疾病"的下位）
- requires: 依赖关系（如"肺结节检测"需要"CT 影像"）
- related_to: 相关（如"肺结节"与"肺癌"相关）

返回 JSON: {{"relation": "synonym", "confidence": 0.9}}
"""
    return llm.generate(prompt)

# 构建图
edges = []
for term1, term2 in candidate_pairs:
    result = extract_relation(term1, term2, context)
    if result['confidence'] >= 0.7:
        edges.append({
            'source': term1,
            'target': term2,
            'relation': result['relation'],
            'weight': result['confidence']
        })
```

**优点**:
- ✅ 关系类型明确
- ✅ 准确率高

**缺点**:
- ❌ 依赖 LLM（成本高）
- ❌ 速度慢

---

### 方案 3: 混合方案（最佳实践）

**流程**:
```
1. 共现关系统计（自动，快速）
   ↓
2. 筛选高置信度关系（PMI > 3.0）
   ↓
3. LLM 标注关系类型（可选，少量）
   ↓
4. 人工审核（可选，核心术语）
   ↓
5. 构建术语图
```

**优势**:
- ✅ 自动学习大部分关系（90%）
- ✅ LLM 标注关键关系（10%）
- ✅ 平衡成本和准确率

---

## 🔍 术语图在搜索中的应用

### 应用 1: 查询扩展

**原始查询**: "肺结节检测"

**扩展流程**:
```javascript
// 1. 分词
const tokens = ["肺结节", "检测"];

// 2. 查找术语图
const node1 = graph.findNode("肺结节");
const node2 = graph.findNode("检测");

// 3. 扩展相关术语（权重>0.7 的邻居）
const expanded = new Set([...tokens]);

node1.neighbors.forEach(neighbor => {
  if (neighbor.edge.weight > 0.7) {
    expanded.add(neighbor.term);
  }
});

node2.neighbors.forEach(neighbor => {
  if (neighbor.edge.weight > 0.7 && neighbor.relation === 'synonym') {
    expanded.add(neighbor.term);
  }
});

// expanded = ["肺结节", "检测", "CT 影像", "筛查"]

// 4. 使用扩展术语查询
const results = searchInvertedIndex(expanded);
```

**效果**:
- ✅ 召回率提升（匹配更多文档）
- ✅ 语义相关（不是盲目扩展）

---

### 应用 2: 语义排序

**原始排序**: 基于词频（TF-IDF）

**语义排序**:
```javascript
function semanticScore(doc, query_terms, graph) {
  let score = 0;
  
  // 1. 基础分（词频）
  score += tfidf(doc, query_terms);
  
  // 2. 术语关联加分
  for (let i = 0; i < query_terms.length; i++) {
    for (let j = i + 1; j < query_terms.length; j++) {
      const edge = graph.findEdge(query_terms[i], query_terms[j]);
      if (edge) {
        score += edge.weight * 0.5;  // 关联术语加分
      }
    }
  }
  
  // 3. 领域匹配加分
  const query_domain = inferDomain(query_terms);
  const doc_domain = doc.domain;
  if (query_domain === doc_domain) {
    score += 0.3;
  }
  
  return score;
}
```

**效果**:
- ✅ 包含关联术语的文档排名更高
- ✅ 同领域文档排名更高

---

### 应用 3: 意图识别

**查询**: "肺结节检测需要做什么检查"

**意图识别流程**:
```javascript
// 1. 提取核心术语
const core_terms = ["肺结节", "检测"];

// 2. 查找术语图
const node = graph.findNode("肺结节");

// 3. 识别意图模式
if (query.includes("需要")) {
  // "requires" 关系
  const required_terms = node.neighbors
    .filter(n => n.relation === 'requires')
    .map(n => n.term);
  // ["CT 影像", "病理检查"]
}

if (query.includes("怎么办") || query.includes("治疗")) {
  // "treated_by" 关系
  const treatment_terms = node.neighbors
    .filter(n => n.relation === 'treated_by')
    .map(n => n.term);
}
```

**效果**:
- ✅ 理解用户意图（检查/治疗/诊断）
- ✅ 提供结构化答案

---

## 📊 术语图规模估算

### 基于当前数据（226 个术语）

**节点数**: 226 个（当前术语词典）

**边数估算**:
- 平均每个术语的邻居数：5-10 个
- 总边数：226 × 7 ≈ **1,582 条边**

**存储大小**:
```javascript
// 节点
{ id: "肺结节", weight: 1.2, domain: "medical_ai" }
// 约 50 字节/节点 × 226 ≈ 11KB

// 边
{ source: "肺结节", target: "CT 影像", relation: "requires", weight: 0.9 }
// 约 80 字节/边 × 1582 ≈ 127KB

// 总计：~140KB（可忽略不计）
```

---

### 查询性能影响

**当前查询延迟**: <10ms

**术语图查询延迟**:
```
查找节点：O(1)（哈希表）
遍历邻居：O(k)（k=邻居数，平均 7）
扩展术语：O(k)
总计：O(k) ≈ 7 次操作，<1ms
```

**影响**: 可忽略（<1ms）

---

## 🛠️ 实现方案

### 阶段 1: 共现关系统计（1 天）

**文件**: `src/utils/term_graph_builder.py`

```python
#!/usr/bin/env python3
"""
术语图构建器 - 基于共现关系统计
"""

import json
from collections import defaultdict
from math import log

def build_term_graph(articles_dir, output_path):
    # 1. 加载所有文章
    documents = load_documents(articles_dir)
    
    # 2. 提取术语
    term_doc_freq = defaultdict(set)  # term -> set of doc_ids
    doc_terms = {}  # doc_id -> [terms]
    
    for doc in documents:
        terms = extract_terms(doc['content'])
        doc_terms[doc['id']] = terms
        for term in terms:
            term_doc_freq[term].add(doc['id'])
    
    # 3. 统计共现
    cooccur_count = defaultdict(int)
    for doc_id, terms in doc_terms.items():
        for i, term1 in enumerate(terms):
            for term2 in terms[i+1:]:
                key = tuple(sorted([term1, term2]))
                cooccur_count[key] += 1
    
    # 4. 计算 PMI
    total_docs = len(documents)
    edges = []
    for (term1, term2), count in cooccur_count.items():
        if count >= 3:  # 阈值
            p_term1 = len(term_doc_freq[term1]) / total_docs
            p_term2 = len(term_doc_freq[term2]) / total_docs
            p_cooccur = count / total_docs
            
            pmi = log(p_cooccur / (p_term1 * p_term2)) if p_term1 * p_term2 > 0 else 0
            
            if pmi > 2.0:  # 阈值
                edges.append({
                    'source': term1,
                    'target': term2,
                    'relation': 'cooccur',
                    'weight': min(1.0, pmi / 5.0),
                    'cooccur_count': count
                })
    
    # 5. 构建图
    graph = {
        'nodes': [
            {'id': term, 'frequency': len(docs)}
            for term, docs in term_doc_freq.items()
        ],
        'edges': edges
    }
    
    # 6. 保存
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(graph, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 术语图已保存：{output_path}")
    print(f"   节点数：{len(graph['nodes'])}")
    print(f"   边数：{len(graph['edges'])}")
```

---

### 阶段 2: 术语图查询接口（0.5 天）

**文件**: `src/utils/term_graph_query.mjs`

```javascript
#!/usr/bin/env node
/**
 * 术语图查询接口
 */

import { readFileSync } from 'fs';

export class TermGraph {
  constructor(graphPath) {
    const data = JSON.parse(readFileSync(graphPath, 'utf-8'));
    this.nodes = new Map(data.nodes.map(n => [n.id, n]));
    this.edges = data.edges;
    
    // 构建邻接表
    this.adjacencyList = new Map();
    for (const edge of this.edges) {
      if (!this.adjacencyList.has(edge.source)) {
        this.adjacencyList.set(edge.source, []);
      }
      this.adjacencyList.get(edge.source).push({
        target: edge.target,
        relation: edge.relation,
        weight: edge.weight
      });
      
      // 无向图
      if (!this.adjacencyList.has(edge.target)) {
        this.adjacencyList.set(edge.target, []);
      }
      this.adjacencyList.get(edge.target).push({
        target: edge.source,
        relation: edge.relation,
        weight: edge.weight
      });
    }
  }
  
  /**
   * 扩展查询术语
   */
  expandTerms(terms, minWeight = 0.7, maxExpand = 10) {
    const expanded = new Set(terms);
    
    for (const term of terms) {
      const neighbors = this.adjacencyList.get(term) || [];
      for (const neighbor of neighbors) {
        if (neighbor.weight >= minWeight) {
          expanded.add(neighbor.target);
        }
      }
      
      if (expanded.size >= maxExpand) break;
    }
    
    return Array.from(expanded);
  }
  
  /**
   * 查找术语关系
   */
  findRelation(term1, term2) {
    const neighbors = this.adjacencyList.get(term1) || [];
    const edge = neighbors.find(n => n.target === term2);
    return edge ? edge.relation : null;
  }
  
  /**
   * 获取术语的邻居
   */
  getNeighbors(term, minWeight = 0.5) {
    const neighbors = this.adjacencyList.get(term) || [];
    return neighbors.filter(n => n.weight >= minWeight);
  }
}

// 使用示例
const graph = new TermGraph('data/term_graph.json');
const expanded = graph.expandTerms(['肺结节', '检测']);
console.log(expanded); // ["肺结节", "检测", "CT 影像", "筛查"]
```

---

### 阶段 3: 集成到查询流程（0.5 天）

**文件**: `src/core/query_with_graph.mjs`

```javascript
#!/usr/bin/env node
/**
 * 集成术语图的查询引擎
 */

import { TermGraph } from '../utils/term_graph_query.mjs';
import { jiebaCut } from '../utils/jieba_tokenizer.mjs';
import { searchInvertedIndex } from './inverted_index.mjs';

export function queryWithExpansion(query, graphPath, indexPath) {
  // 1. 加载术语图
  const graph = new TermGraph(graphPath);
  
  // 2. 分词
  const tokens = jiebaCut(query);
  console.log(`分词：${tokens.join(', ')}`);
  
  // 3. 扩展术语
  const expanded = graph.expandTerms(tokens, 0.7, 10);
  console.log(`扩展术语：${expanded.join(', ')}`);
  
  // 4. 查询倒排索引
  const results = searchInvertedIndex(expanded, indexPath);
  
  // 5. 语义排序
  const rankedResults = results.map(doc => ({
    ...doc,
    score: semanticScore(doc, expanded, graph)
  })).sort((a, b) => b.score - a.score);
  
  return rankedResults;
}

function semanticScore(doc, terms, graph) {
  let score = doc.tf_idf_score || 0;
  
  // 术语关联加分
  for (let i = 0; i < terms.length; i++) {
    for (let j = i + 1; j < terms.length; j++) {
      const relation = graph.findRelation(terms[i], terms[j]);
      if (relation) {
        score += 0.5;
      }
    }
  }
  
  return score;
}
```

---

## 📈 预期效果

### 召回率提升

**当前召回率**: 100.0%（5 个标准查询）

**预期提升**:
- 标准查询：保持 100%（已饱和）
- 长尾查询：85% → 92%+（+7%）
- 跨领域查询：70% → 85%+（+15%）

**示例**:
```
查询："肺部 CT 检查做什么"
当前：["肺部", "CT", "检查"] → 匹配 3 篇
扩展：["肺部", "CT", "检查", "肺结节", "检测", "筛查"] → 匹配 5 篇
```

---

### 查询延迟

**当前延迟**: <10ms

**术语图延迟**:
- 图加载：~50ms（首次）
- 术语扩展：<1ms
- 总计：<11ms（+1ms，可忽略）

---

## 🎯 实施计划

### Phase 1: 共现关系统计（1 天）
- [ ] 实现 `term_graph_builder.py`
- [ ] 处理 23 篇文章
- [ ] 生成 `data/term_graph.json`
- [ ] 验证节点数/边数

### Phase 2: 查询接口（0.5 天）
- [ ] 实现 `term_graph_query.mjs`
- [ ] 实现 `expandTerms()` 方法
- [ ] 单元测试

### Phase 3: 集成测试（0.5 天）
- [ ] 集成到查询流程
- [ ] 对比扩展前后召回率
- [ ] 性能测试

### Phase 4: 优化（可选）
- [ ] LLM 标注关系类型
- [ ] 人工审核核心术语
- [ ] 可视化术语图

---

## 📊 总结

**术语图价值**:
- ✅ 加速搜索意图理解（查询扩展）
- ✅ 提升召回率（尤其是长尾查询）
- ✅ 语义排序（提升准确率）
- ✅ 意图识别（结构化答案）

**实施成本**:
- 开发时间：2 天
- 存储开销：~140KB（可忽略）
- 查询延迟：+1ms（可忽略）

**推荐**: **立即实施**，成本低，收益高！

---

**负责人**: 耗电马喽 🐎⚡  
**日期**: 2026-03-14 08:35  
**状态**: 📝 设计方案，等待确认
