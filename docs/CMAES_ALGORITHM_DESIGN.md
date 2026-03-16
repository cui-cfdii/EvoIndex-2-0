# CMA-ES 自进化算法 v3 设计文档

**版本**: v3 (CMA-ES + 混合评估 + 记忆增强)  
**日期**: 2026-03-13 16:40  
**状态**: ✅ 实现完成

---

## 🎯 算法选型

### 五大先进自进化算法对比

| 算法 | 成熟度 | 推荐优先级 | 核心优势 | 我们的选择 |
|------|--------|-----------|---------|-----------|
| **元学习 (MAML/Reptile)** | ⭐⭐⭐⭐⭐ | P0 | 学会学习，快速适应 | 辅助 |
| **进化策略 (CMA-ES)** | ⭐⭐⭐⭐ | **P0** | 无需梯度，黑盒优化 | **核心** |
| **记忆增强系统** | ⭐⭐⭐⭐ | P0 | 经验积累，长期进化 | 核心 |
| **神经架构搜索 (DARTS)** | ⭐⭐⭐⭐ | P1 | 自动发现最优结构 | 后续 |
| **多智能体协作进化** | ⭐⭐⭐ | P2 | 群体智能，知识共享 | 后续 |

### 为什么选择 CMA-ES？

**CMA-ES (Covariance Matrix Adaptation Evolution Strategy)**

**优势**:
1. ✅ **无需梯度** - 分词质量是黑盒函数，无法求导
2. ✅ **全局搜索** - 协方差矩阵自适应，避免局部最优
3. ✅ **自适应步长** - 自动调整搜索范围
4. ✅ **30+ 年历史** - 1990 年代提出，成熟稳定
5. ✅ **生产就绪** - 广泛应用于工程优化

**适用场景**:
- 参数空间：连续 + 离散混合
- 目标函数：不可导、非凸、多峰
- 约束条件：复杂、非线性
- 评估成本：中等（可并行）

---

## 🧬 算法架构

```
┌─────────────────────────────────────────────────┐
│   自进化分词 Agent v3                            │
├─────────────────────────────────────────────────┤
│  1. CMA-ES 优化器                               │
│     - 优化参数：50 维 (43 词典 + 7 超参)           │
│     - 种群大小：20                             │
│     - 自适应步长 + 协方差矩阵                  │
│                                                 │
│  2. 混合评估器                                  │
│     - 规则评估 (70%) - 稳定可靠                │
│     - LLM 评估 (30%) - 语义理解                │
│     - 自动 fallback 机制                        │
│                                                 │
│  3. 记忆增强系统                                │
│     - 经验缓存 (1000 条)                         │
│     - 历史最佳快照                             │
│     - 失败案例分析                             │
│                                                 │
│  4. 元学习层                                    │
│     - 优化评估器权重                           │
│     - 自适应领域迁移                           │
└─────────────────────────────────────────────────┘
```

---

## 📊 优化参数空间

### 50 维参数向量

```javascript
params = [
  // [0-42] 43 个词典权重 (每个术语的重要性)
  dictWeights: Array(43).fill(1.0),
  
  // [43] 规则评估权重 (0-1)
  ruleWeight: 0.7,
  
  // [44] LLM 评估权重 (自动 = 1 - ruleWeight)
  llmWeight: 0.3,
  
  // [45] 最小词长
  minTokenLength: 2,
  
  // [46] 最大词长
  maxTokenLength: 10,
  
  // [47-49] 其他超参数 (预留)
  mutationRate: 0.1,
  crossoverRate: 0.5,
  selectionPressure: 0.5,
]
```

### 搜索空间

| 参数 | 范围 | 初始值 | 说明 |
|------|------|--------|------|
| dictWeights | [0, 2] | 1.0 | 术语重要性 |
| ruleWeight | [0, 1] | 0.7 | 规则评估权重 |
| minTokenLength | [1, 5] | 2 | 最小词长 |
| maxTokenLength | [5, 20] | 10 | 最大词长 |

---

## 🔬 核心算法流程

### CMA-ES 进化流程

```python
初始化:
  mean = [1.0] * 50  # 初始均值
  sigma = 0.3        # 初始步长
  C = I              # 协方差矩阵 (单位矩阵)
  pc = [0] * 50      # 累积向量
  ps = [0] * 50      # 步长累积向量

For generation = 1 to N:
  # 1. 生成种群
  population = []
  for i in range(lambda):
    params = sample_multivariate_gaussian(mean, sigma, C)
    score = evaluate(params)  # 评估函数
    population.append((params, score))
  
  # 2. 选择最优的 mu 个个体
  population.sort(key=lambda x: x[1], reverse=True)
  selected = population[:mu]
  
  # 3. 更新均值
  new_mean = weighted_average(selected)
  
  # 4. 更新累积向量
  pc = (1-cc) * pc + sqrt(cc*(2-cc)) * (new_mean - mean) / sigma
  ps = (1-cs) * ps + sqrt(cs*(2-cs)) * B * D^-1 * pc
  
  # 5. 更新步长
  sigma *= exp(cs/damps * (||ps||/chiN - 1))
  
  # 6. 更新协方差矩阵
  C = (1-c1-cmu) * C + c1 * pc*pc^T + cmu * sum(wk * dk*dk^T)
  
  # 7. 特征分解
  B, D = eigen_decomposition(C)
  
  # 8. 更新均值
  mean = new_mean
  
  # 9. 记录历史
  history.append({
    'generation': generation,
    'best_score': best_score,
    'mean_score': mean_score,
    'sigma': sigma
  })
```

### 混合评估流程

```python
def evaluate(params):
  # 1. 解析参数
  dict_weights = params[0:43]
  rule_weight = params[43]
  llm_weight = 1 - rule_weight
  
  # 2. 更新评估器
  evaluator.rule_weight = rule_weight
  evaluator.llm_weight = llm_weight
  
  # 3. 在所有测试样本上评估
  total_score = 0
  for sample in test_samples:
    # jieba 分词
    tokens = jieba_tokenize(sample)
    
    # 应用词典权重
    weighted_tokens = [t for t in tokens if dict_weights[dict.index(t)] > 0.5]
    
    # 混合评估
    rule_score = rule_based_eval(sample, weighted_tokens)
    llm_score = llm_based_eval(sample, weighted_tokens)
    
    final_score = rule_weight * rule_score + llm_weight * llm_score
    total_score += final_score
  
  return total_score / len(test_samples) * 30
```

---

## 📈 预期效果

### 性能指标

| 指标 | v2 (简单迭代) | v3 (CMA-ES) | 提升 |
|------|-------------|-----------|------|
| **收敛速度** | 100 代 | 50 代 | **+50%** |
| **最终分数** | 70-80% | 90-95% | **+20%** |
| **稳定性** | 依赖 LLM | 混合评估 | **+80%** |
| **全局最优** | 局部最优 | 全局搜索 | **显著提升** |

### 进化曲线预期

```
分数
100% |                              ●●●●●
     |                        ●●●●
 90% |                  ●●●●
     |            ●●●●
 80% |      ●●●●
     |  ●●●●
 70% |●●
     +------------------------------------
      0   10   20   30   40   50   代
```

---

## 🛠️ 使用方法

### 基础使用

```javascript
import { SelfEvolvingTokenizerV3, createTestSamples } from './src/agents/self_evolving_tokenizer_v3.mjs';

// 初始化
const tokenizer = new SelfEvolvingTokenizerV3({
  baseURL: 'http://127.0.0.1:5000',
  model: 'qwen3.5-35b-a3b',
});

// 设置测试样本
const testSamples = createTestSamples();
tokenizer.setTestSamples(testSamples);

// 运行进化训练
const result = await tokenizer.train(50);

console.log(`最佳分数：${result.bestScore / 30 * 100}%`);
console.log(`优化词典：${tokenizer.getOptimizedDictionary().length} 个术语`);
```

### 导出模型

```javascript
const model = tokenizer.exportModel();

// 保存模型
fs.writeFileSync('tokenizer_model.json', JSON.stringify(model, null, 2));

// 加载模型
const loadedModel = JSON.parse(fs.readFileSync('tokenizer_model.json'));
tokenizer.loadModel(loadedModel);
```

---

## 📋 测试步骤

### Step 1: 运行小规模测试

```bash
cd PageIndex-CN
node test/test_cmaes_evolution.mjs
```

### Step 2: 查看结果

```bash
# 查看测试结果
cat test/cmaes_evolution_results.json
```

### Step 3: 大规模测试（可选）

```javascript
// 修改测试脚本
const result = await tokenizer.train(500); // 500 代
```

---

## 💡 创新点

### 1. CMA-ES 全局优化

**vs 简单迭代**:
- 简单迭代：随机变异，容易陷入局部最优
- CMA-ES：协方差矩阵自适应，全局搜索

### 2. 混合评估稳定性

**vs 纯 LLM 评估**:
- 纯 LLM：依赖模型稳定性，JSON 解析失败
- 混合评估：规则 70% + LLM 30%，自动 fallback

### 3. 记忆增强系统

**经验积累**:
- 缓存最近 1000 次评估
- 保存历史最佳快照
- 分析失败案例

### 4. 元学习能力

**学会如何评估**:
- 自动调整规则/LLM 权重
- 适应不同领域文本
- 持续优化评估策略

---

## ⚠️ 注意事项

### 1. 计算资源

- **种群大小**: 20（默认），可调整
- **每代耗时**: ~2-5 秒（取决于样本数）
- **50 代总耗时**: ~2-5 分钟

### 2. 内存占用

- **缓存大小**: 1000 条（默认）
- **历史记录**: 每代~1KB
- **总内存**: ~50-100MB

### 3. LLM 依赖

- **评估权重**: LLM 占 30%
- **fallback**: LLM 失败时用规则评估
- **建议**: 使用稳定模型（qwen3.5-35b-a3b）

---

## 🎯 下一步计划

### 短期（1 小时）
- [ ] 运行 50 代小规模测试
- [ ] 验证 CMA-ES 有效性
- [ ] 调整超参数

### 中期（1 天）
- [ ] 运行 500 代大规模测试
- [ ] 对比 v2 vs v3 效果
- [ ] 优化评估策略

### 长期（1 周）
- [ ] 集成到生产环境
- [ ] 添加更多测试样本
- [ ] 支持多领域适应

---

**算法实现完成！准备进行测试！** 🎉
