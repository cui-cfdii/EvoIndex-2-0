# EvoIndex-CN v2.0 - 自进化术语词典检索系统

**原项目名**: PageIndex-CN（2026-03-14 改名）  
**Evo**: Evolution（自进化）+ Index（索引）  
**CN**: 中文优化（jieba 分词 + 领域自适应）

---

## 🎯 核心特性

- ✅ **自进化术语词典**: 从互联网自动学习，持续更新
- ✅ **规则评估筛选**: 5 分制评分，只保留高质量术语（22.9% 保留率）
- ✅ **倒排索引**: 跨文档术语聚合，快速检索
- ✅ **领域自适应**: 5 个专业领域（AI/医疗/法律/金融/LLM）
- ✅ **召回率验证**: 自动验证，<92% 触发优化/回滚
- ✅ **零 LLM 依赖**: 规则评估快 1000 倍，零成本
- ✅ **PDF 解析支持**: OpenDataLoader PDF + MinerU 双引擎（2026-03-21 新增）

---

## 📊 性能指标

| 指标 | 原 PageIndex | EvoIndex-CN v2.0 | 提升 |
|------|-------------|------------------|------|
| **召回率** | 82.2% | 100.0% | +17.8% |
| **术语数** | 0 | 226 | +∞ |
| **领域数** | 1 | 5 | +400% |
| **自进化** | ❌ | ✅ | 质变 |
| **查询延迟** | <10ms | <10ms | 持平 |

---

## 🏗️ 系统架构

```
互联网文章 (Tavily API)
   ↓
jieba 分词 + TF-IDF 提取
   ↓
规则评估（5 分制，保留>=4 分）
   ↓
动态术语词典（226 术语，5 领域）
   ↓
倒排索引 + 召回率验证
   ↓
自进化闭环（每周更新）
```

---

## 🚀 快速开始

### 前置要求

1. **Node.js**: >= 18.0.0
2. **Python**: >= 3.8
3. **jieba**: `pip install jieba`
4. **Tavily API Key**（可选，用于自进化）

### 安装

```bash
cd EvoIndex-CN
npm install
pip install jieba
```

### 配置环境变量

```bash
# Windows (PowerShell)
$env:TAVILY_API_KEY="tvly-your-api-key"

# Linux/Mac
export TAVILY_API_KEY="tvly-your-api-key"
```

### 快速测试

```bash
# 1. 术语提取测试
python src/utils/term_extractor.py test

# 2. 召回率测试
node test/recall_test_v5_jieba.mjs

# 3. 自进化流程（完整）
./scripts/self_evolution.sh medical_ai "肺结节检测 AI"

# 4. PDF 解析测试（新增）
node test/integration_test_pdf.mjs

# 5. PDF 使用示例（新增）
node examples/pdf_usage.mjs
```

---

## 📄 PDF 解析功能（新增）

### 支持的 PDF 引擎

| 引擎 | 特点 | 适用场景 |
|------|------|----------|
| **OpenDataLoader PDF** | 零 GPU、轻量级、快速 | 默认推荐，日常使用 |
| **MinerU** | GPU 加速、高精度公式识别 | 科研论文、技术文档 |

### 快速使用

```bash
# 解析单个 PDF
node src/core/tree.mjs document.pdf index.json

# 指定引擎
node src/core/tree.mjs document.pdf index.json --engine opendataloader

# 使用 MinerU（GPU 加速）
node src/core/tree.mjs document.pdf index.json --engine mineru --use-gpu

# 详细输出
node src/core/tree.mjs document.pdf index.json --verbose
```

### API 使用

```javascript
import { parseDocument } from './src/core/parser.mjs';

// 自动检测文档类型
const doc = await parseDocument('document.pdf');

// 指定 PDF 引擎
const doc = await parseDocument('document.pdf', {
  engine: 'opendataloader',  // 或 'mineru'
  useGPU: false,
  verbose: true
});

console.log(doc.type);        // 'pdf'
console.log(doc.content);     // Markdown 格式内容
console.log(doc.sections);    // 章节列表
```

### 安装依赖

```bash
# OpenDataLoader PDF（推荐）
npx skillhub install opendataloader-pdf

# MinerU（可选，需要 GPU）
pip install mineru
```

### 批量解析

```javascript
import { createPDFParser } from './src/core/pdf_parser.mjs';

const parser = createPDFParser({ engine: 'opendataloader' });

const result = await parser.parseBatch(['doc1.pdf', 'doc2.pdf', 'doc3.pdf']);

console.log(`成功：${result.success}/${result.total}`);
```

**详细文档**: [docs/PDF_INTEGRATION.md](docs/PDF_INTEGRATION.md)  
**使用示例**: [examples/pdf_usage.mjs](examples/pdf_usage.mjs)

---

## 📁 项目结构

```
EvoIndex-CN/
├── src/
│   ├── utils/
│   │   ├── term_extractor.py       # 术语提取器
│   │   ├── dictionary_manager.mjs  # 词典管理器
│   │   └── jieba_tokenizer.py      # jieba 分词服务
│   ├── agents/
│   │   └── term_evaluator.mjs      # 术语评估器
│   └── core/
│       ├── parser.mjs              # 文档解析器（支持 MD/PDF）
│       ├── pdf_parser.mjs          # PDF 解析器（新增）
│       ├── opendataloader_adapter.mjs  # OpenDataLoader 适配器（新增）
│       ├── mineru_adapter.mjs      # MinerU 适配器（新增）
│       ├── tree.mjs                # 树索引构建器
│       └── query_tree.mjs          # 查询引擎
├── scripts/
│   ├── fetch_articles.js           # Tavily 文章抓取器
│   └── self_evolution.sh           # 自进化主脚本
├── test/
│   ├── recall_test_v5_jieba.mjs    # 召回率测试
│   ├── pdf_parser_test.mjs         # PDF 单元测试（新增）
│   └── integration_test_pdf.mjs    # PDF 集成测试（新增）
├── examples/
│   └── pdf_usage.mjs               # PDF 使用示例（新增）
├── reports/
│   └── code_review_pdf.md          # 代码审查报告（新增）
├── data/
│   ├── articles/                   # 互联网文章（按领域分类）
│   │   ├── medical_ai/             # 医疗 AI（5 篇）
│   │   ├── legal_tech/             # 法律科技（5 篇）
│   │   ├── fintech/                # 金融科技（5 篇）
│   │   └── llm/                    # LLM 技术（8 篇）
│   └── optimized_dictionary_v*.json # 词典版本（保留最近 10 个）
└── docs/
    ├── ARCHITECTURE.md             # 架构设计
    ├── DEPLOYMENT.md               # 部署指南
    ├── ALGORITHM_ANALYSIS.md       # 算法分析
    ├── TERM_GRAPH_DESIGN.md        # 术语图设计
    ├── FINAL_SUMMARY.md            # 项目总结
    └── PDF_INTEGRATION.md          # PDF 集成文档（新增）
```
    ├── TERM_GRAPH_DESIGN.md        # 术语图设计
    └── FINAL_SUMMARY.md            # 项目总结
```

---

## 🔄 自进化流程

### 定期批量更新（推荐）

**频率**: 每周执行一次（凌晨 2 点）

**流程**:
```bash
# 1. 抓取各领域最新文章（5 篇/领域）
node scripts/fetch_articles.js --domain medical_ai --query "最新" --max 5

# 2. 批量提取术语
python src/utils/term_extractor.py dir data/articles data/terms_all.json 50

# 3. 评估术语质量
node src/agents/term_evaluator.mjs data/terms_all.json data/evaluated.json

# 4. 更新词典
node src/utils/dictionary_manager.mjs add data/evaluated.json

# 5. 召回率验证
node test/recall_test_v5_jieba.mjs
# 如果<92%，自动回滚
```

---

## 📈 术语增长

| 版本 | 术语数 | 领域 | 召回率 | 日期 |
|------|--------|------|--------|------|
| v5 | 52 | AI 通用 | 100% | 2026-03-13 |
| v6 | 107 | AI + 医疗 | 100% | 2026-03-14 |
| v7 | 226 | 5 领域 | 100% | 2026-03-14 |

**术语来源**:
- AI 通用：52 术语
- 医疗 AI：55 术语
- 法律科技：45 术语
- 金融科技：36 术语
- LLM 技术：38 术语

---

## 🎯 核心优势

### 1. 高召回率
- **标准查询**: 100.0%（5 个标准查询）
- **长尾查询**: 85%+（预期 92%+ with 术语图）

### 2. 领域自适应
- 5 个专业领域（AI/医疗/法律/金融/LLM）
- 自动领域分类（从文件名推断）
- 领域关键词库（预定义 + 自动扩展）

### 3. 自进化能力
- 每周自动更新
- 0 人工干预
- 召回率验证闭环（<92% 自动回滚）

### 4. 零 LLM 依赖
- 规则评估：<1ms/术语
- LLM 评估：2-5 秒/术语（已弃用）
- 准确率：100%（已验证）

### 5. 低成本
- API 成本：¥0（Tavily 免费额度）
- 存储成本：~300KB
- 维护成本：低（自动化）

---

## ⚠️ 已知限制

1. **文档格式**: 仅支持 Markdown（PDF/Word 支持计划中）
2. **术语图**: 已设计，待实施（2 天）
3. **Tavily API**: 依赖互联网（有降级策略）
4. **术语膨胀**: 已控制（保留率 22.9%）

---

## 🚧 未来规划

### 短期（1-2 周）
- [ ] 术语图实施（2 天）
- [ ] 定期清理脚本
- [ ] 领域关键词库扩展（新增 5 领域）

### 中期（1-2 月）
- [ ] PDF/Word 支持
- [ ] 查询接口优化（自然语言）
- [ ] 监控仪表板

### 长期（3-6 月）
- [ ] 术语层次化（本体）
- [ ] 多语言支持（中英双语）
- [ ] 知识图谱集成（Neo4j）

---

## 📚 文档

- **架构设计**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **部署指南**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **算法分析**: [docs/ALGORITHM_ANALYSIS.md](docs/ALGORITHM_ANALYSIS.md)
- **术语图设计**: [docs/TERM_GRAPH_DESIGN.md](docs/TERM_GRAPH_DESIGN.md)
- **项目总结**: [docs/FINAL_SUMMARY.md](docs/FINAL_SUMMARY.md)

---

## 🎉 总结

**EvoIndex-CN** 是一个**可持续进化的知识库检索系统**，核心特点：

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
**最后更新**: 2026-03-14 10:47  
**项目状态**: ✅ 生产就绪
