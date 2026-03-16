# EvoIndex 2.0 项目章程

**版本**: v2.0.0  
**创建时间**: 2026-03-15 11:31  
**皇帝**: 刘雨石  
**军机大臣**: 耗电马喽

---

## 🎯 项目目标

基于 EvoIndex-CN v1.0 的成功经验，实现**意图识别 + 自进化闭环**，打造真正的智能知识管家。

---

## 📜 核心特性

### 1. 意图识别（新增）

**功能**: 理解用户查询的真实意图

**示例**:
```
查询："肺结核的治疗手段有哪些"
意图：disease_treatment（疾病治疗）
实体：["肺结核"]
需要的文档类型：["指南", "临床路径", "专家共识"]
```

**实现**:
- `src/core/intent_classifier.mjs` - 意图分类器
- `src/utils/intent_term_map.json` - 意图 - 术语映射表

---

### 2. 自进化触发器（新增）

**功能**: 检测到低匹配度时自动触发学习

**触发条件**:
```javascript
IF 术语匹配度 < 80% 
   OR 召回率 < 92%
   OR 新领域查询（首次出现）
THEN 触发自进化学习
```

**实现**:
- `src/core/evolution_trigger.mjs` - 触发器
- `src/core/coverage_checker.mjs` - 覆盖度检查

---

### 3. Tavily API 集成（新增）

**功能**: 自动搜索互联网高质量文献

**流程**:
```
触发学习 → Tavily 搜索 → 下载 10-20 篇文献 → 术语提取
```

**实现**:
- `src/utils/tavily_search.mjs` - 搜索服务
- `src/utils/batch_download.mjs` - 批量下载

---

### 4. 术语评估优化（增强）

**功能**: 5 分制规则评估，只保留优质术语

**评估维度**:
| 维度 | 权重 | 说明 |
|------|------|------|
| 词频 | 30% | 在文献中出现频率 |
| 领域特异性 | 30% | 是否专业术语 |
| 共现关系 | 20% | 与其他术语的关联 |
| 来源质量 | 20% | 文献来源权威性 |

**实现**:
- `src/agents/term_evaluator_v2.mjs` - 评估器 v2
- `src/agents/quality_scorer.mjs` - 质量评分

---

### 5. 召回率验证（增强）

**功能**: 学习后自动验证，<92% 自动回滚

**实现**:
- `src/core/recall_validator.mjs` - 验证器
- `src/core/rollback_manager.mjs` - 回滚管理

---

## 🏗️ 项目结构

```
EvoIndex-2.0/
├── src/
│   ├── core/
│   │   ├── intent_classifier.mjs      # 意图分类器（新增）
│   │   ├── evolution_trigger.mjs      # 自进化触发器（新增）
│   │   ├── coverage_checker.mjs       # 覆盖度检查（新增）
│   │   ├── recall_validator.mjs       # 召回率验证（新增）
│   │   └── rollback_manager.mjs       # 回滚管理（新增）
│   ├── agents/
│   │   ├── term_evaluator_v2.mjs      # 术语评估 v2（增强）
│   │   └── quality_scorer.mjs         # 质量评分（新增）
│   ├── utils/
│   │   ├── tavily_search.mjs          # Tavily 搜索（新增）
│   │   ├── batch_download.mjs         # 批量下载（新增）
│   │   └── ...                        # 继承自 v1.0
│   └── ...                            # 继承自 v1.0
├── docs/
│   ├── INTENT_RECOGNITION_DESIGN.md   # 意图识别设计
│   ├── EVOLUTION_TRIGGER_DESIGN.md    # 自进化触发器设计
│   └── ...                            # 继承自 v1.0
├── test/
│   ├── intent_test.mjs                # 意图识别测试
│   ├── evolution_test.mjs             # 自进化测试
│   └── ...                            # 继承自 v1.0
└── PROJECT_CHARTER.md                 # 项目章程（本文件）
```

---

## 📅 开发计划

### Phase 1: 意图识别（1-2 周）

**任务**:
- [ ] 定义意图分类体系
- [ ] 实现意图分类器（规则版）
- [ ] 创建意图 - 术语映射表
- [ ] 编写测试用例

**输出**:
- `src/core/intent_classifier.mjs`
- `src/utils/intent_term_map.json`
- `docs/INTENT_RECOGNITION_DESIGN.md`

---

### Phase 2: 自进化触发器（1-2 周）

**任务**:
- [ ] 实现覆盖度检查器
- [ ] 实现触发器逻辑
- [ ] 集成 Tavily API
- [ ] 批量下载功能

**输出**:
- `src/core/evolution_trigger.mjs`
- `src/core/coverage_checker.mjs`
- `src/utils/tavily_search.mjs`

---

### Phase 3: 术语评估优化（1 周）

**任务**:
- [ ] 优化评估规则
- [ ] 增加来源质量权重
- [ ] 医学术语优先策略
- [ ] 测试评估效果

**输出**:
- `src/agents/term_evaluator_v2.mjs`
- `docs/TERM_EVALUATION_V2.md`

---

### Phase 4: 召回率验证（1 周）

**任务**:
- [ ] 实现验证器
- [ ] 实现回滚机制
- [ ] 设置 92% 阈值
- [ ] 测试验证流程

**输出**:
- `src/core/recall_validator.mjs`
- `src/core/rollback_manager.mjs`

---

### Phase 5: 集成测试（1 周）

**任务**:
- [ ] 端到端测试
- [ ] 性能测试
- [ ] 医学术语学习测试
- [ ] 编写测试报告

**输出**:
- `test/e2e_test.mjs`
- `docs/PHASE1_COMPLETION_REPORT.md`

---

## 📊 成功指标

| 指标 | v1.0 | v2.0 目标 | 提升 |
|------|------|---------|------|
| **意图识别** | ❌ | ✅ 90%+ | 新增 |
| **自进化触发** | ❌ | ✅ 自动 | 新增 |
| **新领域召回率** | 25-40% | 90%+ | +50%+ |
| **术语质量** | 22.9% 保留率 | 25%+ | +2% |
| **查询响应时间** | <10ms | <15ms | -5ms |

---

## 👥 团队分工

| 角色 | 负责模块 | 官员 |
|------|---------|------|
| **军机处** | 总协调 | 耗电马喽 |
| **中书省** | 方案设计 | agent-deep-research |
| **尚书省** | 代码实现 | coding-agent + Software Engineer |
| **门下省** | 质量审查 | skill-vetter + astrai-code-review |
| **东厂** | 情报收集 | tavily-search |
| **起居郎** | 记录历史 | agent-memory-ultimate |

---

## 🎯 第一阶段目标（2 周）

**完成**:
1. ✅ 意图识别模块
2. ✅ 自进化触发器
3. ✅ Tavily API 集成

**验证查询**:
```
"肺结核的治疗手段有哪些"
→ 识别意图：disease_treatment
→ 检测术语缺失
→ 触发学习
→ 搜索 10 篇文献
→ 提取 100+ 新术语
→ 召回率从 25% 提升到 90%+
```

---

## 📝 变更记录

| 日期 | 变更 | 负责人 |
|------|------|--------|
| 2026-03-15 | 项目创建 | 耗电马喽 |
| 2026-03-15 | 任务分配 | 耗电马喽 |

---

*最后更新：2026-03-15 11:31*  
*版本：v1.0 - 项目启动*
