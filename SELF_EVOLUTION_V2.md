# PageIndex-CN 自进化方案 v2.0

**日期**: 2026-03-14 04:00  
**目标**: 构建可持续进化的知识库系统  
**核心理念**: 从互联网自动学习，持续优化召回率

---

## 🎯 当前问题

### 静态词典的局限性
| 问题 | 现状 | 影响 |
|------|------|------|
| **术语覆盖** | 43 个固定术语 | 无法适应新领域 |
| **扩展方式** | 手动添加 | 效率低，依赖人工 |
| **领域适应** | AI 领域专用 | 医疗/法律/金融等新领域失效 |
| **进化能力** | 无 | 系统无法自我优化 |

### P2 测试失败的根本原因
- 新增 8 个专业文档（医疗、法律、LLM）
- 词典缺少"肺结节"、"眼底"、"筛查"等新术语
- 召回率从 91.7% 降到 49.0%

**结论**: 静态词典无法支撑动态知识库

---

## 🚀 自进化方案设计

### 整体架构
```
┌─────────────────────────────────────────────────────────┐
│               PageIndex-CN 自进化系统                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐      ┌─────────────┐                  │
│  │  Tavily API │ ───> │  文章抓取器  │                  │
│  │  (互联网)   │      │  (Scraper)  │                  │
│  └─────────────┘      └──────┬──────┘                  │
│                              │                          │
│                              v                          │
│  ┌──────────────────────────────────────┐              │
│  │         术语提取器                    │              │
│  │    (Term Extractor + jieba)          │              │
│  │  ┌────────────────────────────────┐  │              │
│  │  │ - jieba 分词                   │  │              │
│  │  │ - 词性标注                     │  │              │
│  │  │ - 新词发现                     │  │              │
│  │  │ - 术语筛选（TF-IDF + 频率）    │  │              │
│  │  └────────────────────────────────┘  │              │
│  └───────────────┬──────────────────────┘              │
│                  │                                      │
│                  v                                      │
│  ┌──────────────────────────────────────┐              │
│  │      术语评估器                      │              │
│  │   (Term Evaluator + LLM)             │              │
│  │  ┌────────────────────────────────┐  │              │
│  │  │ - 术语质量评分（LLM）           │  │              │
│  │  │ - 领域分类                     │  │              │
│  │  │ - 去重合并                     │  │              │
│  │  └────────────────────────────────┘  │              │
│  └───────────────┬──────────────────────┘              │
│                  │                                      │
│                  v                                      │
│  ┌──────────────────────────────────────┐              │
│  │      词典更新器                      │              │
│  │   (Dictionary Updater)               │              │
│  │  ┌────────────────────────────────┐  │              │
│  │  │ - 添加新术语                   │  │              │
│  │  │ - 更新权重（CMA-ES）           │  │              │
│  │  │ - 版本管理                     │  │              │
│  │  └────────────────────────────────┘  │              │
│  └───────────────┬──────────────────────┘              │
│                  │                                      │
│                  v                                      │
│  ┌──────────────────────────────────────┐              │
│  │      召回率验证                      │              │
│  │   (Recall Validator)                 │  │
│  │  ┌────────────────────────────────┐  │              │
│  │  │ - 运行标准测试集               │  │              │
│  │  │ - 召回率 >= 92%？              │  │              │
│  │  │ - 通过 → 保存新版本            │  │              │
│  │  │ - 失败 → 回滚 + 分析           │  │              │
│  │  └────────────────────────────────┘  │              │
│  └──────────────────────────────────────┘              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 自进化流程（6 步闭环）

### Step 1: 互联网文章抓取
```javascript
// 使用 Tavily API 搜索特定领域文章
const searchQuery = "肺结节检测 AI 医疗影像 2025";
const results = await tavily.search(searchQuery, {
  maxResults: 10,
  includeContent: true
});

// 保存文章到 data/articles/medical_ai/
```

**领域分类**:
- `medical_ai/` - 医疗 AI
- `legal_fintech/` - 法律科技 + 金融科技
- `llm/` - 大模型技术
- `ai_tech/` - AI 技术前沿

---

### Step 2: 术语提取
```python
# src/utils/term_extractor.py
import jieba
import jieba.analyse

def extract_terms(text, top_k=50):
    """提取高频术语"""
    # jieba 分词
    tokens = jieba.lcut(text)
    
    # 过滤：长度>=2，名词/动词
    filtered = [t for t in tokens if len(t) >= 2 and t.pos in ['n', 'v']]
    
    # TF-IDF 排序
    keywords = jieba.analyse.extract_tags(
        text, 
        topK=top_k, 
        withWeight=True,
        allowPOS=('n', 'vn', 'v')
    )
    
    return [(term, weight) for term, weight in keywords]

# 输出示例
# [('肺结节', 0.95), ('CT 影像', 0.87), ('筛查', 0.82), ...]
```

---

### Step 3: 术语质量评估（LLM）
```javascript
// src/agents/term_evaluator.mjs
async function evaluateTerm(term, context) {
  const prompt = `
评估以下术语是否为高质量专业术语：
术语：${term}
上下文：${context}

评分标准：
- 5 分：核心专业术语（如"肺结节"）
- 4 分：重要相关术语（如"CT 影像"）
- 3 分：一般术语（如"检测"）
- 2 分：通用词汇（如"方法"）
- 1 分：停用词（如"的"、"了"）

返回 JSON: {"score": 1-5, "category": "medical/ai/general"}
`;

  const result = await llm.generate(prompt);
  return JSON.parse(result);
}

// 筛选：只保留 score >= 4 的术语
```

---

### Step 4: 词典更新（版本管理）
```javascript
// src/utils/dictionary_manager.mjs
function updateDictionary(newTerms, currentDict) {
  // 1. 去重：新术语不在当前词典中
  const uniqueTerms = newTerms.filter(
    t => !currentDict.dictionary.some(d => d.term === t.term)
  );
  
  // 2. 添加新术语（初始权重=1.0）
  const updated = {
    ...currentDict,
    version: `v${parseInt(currentDict.version.split('-')[1]) + 1}`,
    timestamp: new Date().toISOString(),
    dictionary: [
      ...currentDict.dictionary,
      ...uniqueTerms.map(t => ({
        term: t.term,
        weight: 1.0,
        frequency: t.frequency,
        domain: t.domain,
        addedAt: new Date().toISOString()
      }))
    ]
  };
  
  // 3. 保存新版本
  fs.writeFileSync(
    `data/optimized_dictionary_v${updated.version}.json`,
    JSON.stringify(updated, null, 2)
  );
  
  return updated;
}
```

---

### Step 5: CMA-ES 权重优化
```javascript
// test/auto_optimize_weights.mjs
async function optimizeWeights(newDictionary) {
  console.log('🚀 开始 CMA-ES 权重优化...');
  
  // 使用标准测试集（5 个样本）验证
  const testResults = await runRecallTest(newDictionary);
  
  if (testResults.avgRecall >= 0.92) {
    console.log(`✅ 召回率 ${testResults.avgRecall * 100}% >= 92%，通过！`);
    return newDictionary;
  }
  
  // 召回率不足，运行 CMA-ES 优化
  console.log('⚠️  召回率不足，启动 CMA-ES 优化...');
  const optimized = await cmaes.optimize(newDictionary);
  
  // 重新验证
  const optimizedResults = await runRecallTest(optimized);
  
  if (optimizedResults.avgRecall >= 0.92) {
    console.log(`✅ 优化后召回率 ${optimizedResults.avgRecall * 100}% >= 92%，通过！`);
    return optimized;
  }
  
  // 优化失败，回滚
  console.log('❌ 优化失败，回滚到上一版本');
  return null;
}
```

---

### Step 6: 自动化闭环
```bash
#!/bin/bash
# scripts/self_evolution.sh

echo "🐎⚡ PageIndex-CN 自进化流程启动"

# Step 1: 从 Tavily 抓取新文章
echo "Step 1: 抓取互联网文章..."
node scripts/fetch_articles.js --domain medical_ai --query "肺结节检测 AI"

# Step 2: 提取术语
echo "Step 2: 提取术语..."
python src/utils/term_extractor.py data/articles/medical_ai/*.md

# Step 3: LLM 评估术语质量
echo "Step 3: 评估术语质量..."
node src/agents/term_evaluator.mjs

# Step 4: 更新词典
echo "Step 4: 更新词典..."
node src/utils/dictionary_manager.mjs update

# Step 5: CMA-ES 优化权重
echo "Step 5: 优化权重..."
node test/auto_optimize_weights.mjs

# Step 6: 运行召回率测试
echo "Step 6: 验证召回率..."
node test/recall_test_v5_jieba.mjs

# Step 7: 保存/回滚
if [ $? -eq 0 ]; then
  echo "✅ 自进化成功！保存新版本"
  git add data/optimized_dictionary_*.json
  git commit -m "feat: 自进化更新 v$(date +%Y%m%d)"
else
  echo "❌ 自进化失败，回滚"
  git checkout -- data/optimized_dictionary.json
fi

echo "🎉 自进化流程完成"
```

---

## 📊 预期效果

### 术语增长曲线
| 阶段 | 术语数量 | 召回率 | 覆盖领域 |
|------|---------|--------|---------|
| **v5（当前）** | 43 | 100% | AI 通用 |
| **v7（医疗）** | 80+ | 95% | AI + 医疗 |
| **v10（法律）** | 120+ | 93% | AI + 医疗 + 法律 |
| **v15（金融）** | 160+ | 92% | AI + 医疗 + 法律 + 金融 |

### 自进化周期
- **单次迭代**: 10-15 分钟
- **频率**: 每周 1-2 次（或按需触发）
- **人工干预**: 仅审核新术语（5 分钟）

---

## 🛠️ 实施计划

### Phase 1: 基础架构（1 天）
- [ ] 实现 `term_extractor.py`
- [ ] 实现 `term_evaluator.mjs`
- [ ] 实现 `dictionary_manager.mjs`
- [ ] 实现 `auto_optimize_weights.mjs`

### Phase 2: Tavily 集成（2 小时）
- [ ] 编写 `fetch_articles.js`
- [ ] 配置 Tavily API
- [ ] 测试文章抓取

### Phase 3: 自动化脚本（2 小时）
- [ ] 编写 `self_evolution.sh`
- [ ] 配置 git 版本管理
- [ ] 测试完整流程

### Phase 4: 测试验证（1 天）
- [ ] 医疗领域测试（肺结节检测）
- [ ] 法律领域测试（合同审查）
- [ ] 金融领域测试（风险评估）

### Phase 5: 部署上线（1 小时）
- [ ] 配置定时任务（每周执行）
- [ ] 设置告警（召回率<90%）
- [ ] 文档完善

---

## 🎯 核心优势

| 特性 | 静态词典 | 自进化词典 |
|------|---------|-----------|
| **术语更新** | 手动 | 自动 |
| **领域适应** | 单一领域 | 多领域 |
| **召回率** | 固定 | 持续提升 |
| **维护成本** | 高 | 低 |
| **可扩展性** | 差 | 优秀 |

---

## 💡 关键创新点

1. **互联网驱动**: 从 Tavily 实时获取最新行业文章
2. **LLM 评估**: 用 AI 判断术语质量，避免噪声
3. **CMA-ES 优化**: 自动调整权重，最大化召回率
4. **版本管理**: 每次更新可追溯、可回滚
5. **闭环验证**: 召回率<92% 自动回滚，保证稳定性

---

## 🚨 风险控制

| 风险 | 缓解措施 |
|------|---------|
| **噪声术语** | LLM 评估 + 人工审核（前 10 次） |
| **召回率下降** | 自动回滚 + 告警 |
| **术语冲突** | 去重逻辑 + 领域分类 |
| **API 限流** | Tavily 降级策略（每日限 100 次） |

---

**负责人**: 耗电马喽 🐎⚡  
**启动时间**: 2026-03-14 04:00  
**预计完成**: 2026-03-15 20:00

---

## 📝 下一步行动

**需要确认**:
1. ✅ 方案是否可行？
2. ✅ 是否立即开始实施 Phase 1？
3. ✅ 优先覆盖哪个新领域（医疗/法律/金融）？

**建议**: 先拿**医疗领域**做试点（肺结节检测文章），验证流程后再扩展到其他领域。

需要我立即开始实现吗？🐎⚡
