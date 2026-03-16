# EvoIndex-2.0 Skill 发布方案

**版本**: v2.0.0  
**制定时间**: 2026-03-16 12:35  
**发布策略**: ClawHub 公共 Registry + GitHub 双发布

---

## 🎯 发布目标

1. ✅ **ClawHub 公共 Registry** - 用户可通过 `clawhub install evoindex-2-0` 安装
2. ✅ **GitHub Release** - 提供源码下载和技术文档
3. ✅ **可验证性** - 发布后可在网上搜索到
4. ✅ **易用性** - 用户一键安装，开箱即用

---

## 📋 发布前准备

### 1. Skill 包结构

```
skills/evoindex-2-0/
├── SKILL.md                        ✅ 核心说明文档
├── src/
│   ├── core/
│   │   ├── intent_classifier.mjs   ✅ 意图分类器
│   │   ├── evolution_trigger.mjs   ✅ 自进化触发器
│   │   └── mem0_integration.mjs    ✅ 记忆集成
│   └── utils/
│       ├── local_memory_service.mjs ✅ 本地记忆服务
│       └── intent_term_map.json     ✅ 意图 - 术语映射
├── test/
│   ├── intent_classifier_test.mjs   ✅ 意图测试
│   └── e2e_test.mjs                 ✅ 端到端测试
└── docs/
    ├── FINAL_SUMMARY_REPORT.md      ✅ 总结报告
    └── PHASE4_TEST_REPORT.md        ✅ 测试报告
```

### 2. 验证清单

- [x] SKILL.md 格式正确（YAML frontmatter + Markdown）
- [x] 核心代码文件完整
- [x] 测试文件可运行
- [x] 文档齐全
- [ ] 打包验证通过
- [ ] 发布到 ClawHub
- [ ] 发布到 GitHub
- [ ] 网上可搜索

---

## 🚀 发布步骤

### 步骤 1: 本地打包验证

```bash
cd C:\Users\cuihao\.openclaw\workspace

# 使用 skill-creator 打包
python skills\skill-creator\scripts\package_skill.py skills\evoindex-2-0
```

**预期输出**:
```
✅ Validation passed
✅ Packaged to evoindex-2-0.skill (XX KB)
```

---

### 步骤 2: 发布到 ClawHub

```bash
# 登录 ClawHub（首次需要）
npx clawhub login

# 发布技能
npx clawhub publish skills\evoindex-2-0 --public

# 验证发布
npx clawhub inspect evoindex-2-0
```

**预期输出**:
```
✅ Published to registry
🌐 View at: https://clawhub.com/skills/evoindex-2-0
📦 Install with: clawhub install evoindex-2-0
```

---

### 步骤 3: 发布到 GitHub

```bash
cd C:\Users\cuihao\.openclaw\workspace\projects\EvoIndex-2.0

# 初始化 Git（如果还没有）
git init
git add .
git commit -m "EvoIndex-2.0 v2.0.0: 意图识别 + 自进化闭环"

# 创建 GitHub Release
git tag v2.0.0
git push origin main --tags

# 创建 Release（使用 GitHub CLI）
gh release create v2.0.0 --title "EvoIndex-2.0 v2.0.0" --notes "意图识别 + 自进化闭环"
```

**预期输出**:
```
✅ Created release v2.0.0
🌐 https://github.com/yourusername/EvoIndex-2.0/releases/tag/v2.0.0
```

---

### 步骤 4: 验证可访问性

#### 4.1 ClawHub 验证

```bash
# 搜索技能
npx clawhub search evoindex

# 尝试安装（测试环境）
npx clawhub install evoindex-2-0 --dry-run
```

#### 4.2 GitHub 验证

```bash
# 浏览器访问
https://github.com/search?q=evoindex-2-0

# 或直接访问
https://github.com/yourusername/EvoIndex-2.0
```

#### 4.3 搜索引擎验证

等待 24-48 小时后，在搜索引擎中搜索：
- "EvoIndex-2.0 ClawHub"
- "EvoIndex-2.0 GitHub"
- "EvoIndex-2.0 意图识别 自进化"

---

## ⚠️ 失败原因分析（之前发布）

### 可能问题 1: 发布到私有 Registry

**症状**: 发布成功但网上找不到  
**解决**: 确认使用 `--public` 参数

```bash
# ❌ 错误：默认可能发布到私有
npx clawhub publish skills\evoindex-2-0

# ✅ 正确：明确指定公开
npx clawhub publish skills\evoindex-2-0 --public
```

---

### 可能问题 2: Skill 名称不规范

**症状**: 搜索不到  
**解决**: 使用标准命名

```json
// SKILL.md frontmatter
{
  "name": "evoindex-2-0",      // ✅ 正确：小写 + 连字符
  "description": "..."
}
```

---

### 可能问题 3: 未验证发布结果

**症状**: 以为发布了，实际失败  
**解决**: 发布后立即验证

```bash
# 发布后立即验证
npx clawhub inspect evoindex-2-0
npx clawhub search evoindex
```

---

## 📊 发布后验证清单

- [ ] ClawHub 可搜索：`clawhub search evoindex`
- [ ] ClawHub 可安装：`clawhub install evoindex-2-0`
- [ ] GitHub 可访问：浏览器打开仓库
- [ ] 搜索引擎可找到：Google/百度搜索 "EvoIndex-2.0"
- [ ] 实际安装测试：在新环境安装并运行

---

## 🎯 成功标准

### ClawHub 发布成功
```bash
$ clawhub search evoindex

evoindex-2-0 (v2.0.0)
意图识别 + 自进化闭环的智能知识管家
⭐ 4.9 | 📥 100+ | 📝 MIT
```

### GitHub 发布成功
```
🌟 50+ Stars
🍴 20+ Forks
📥 100+ Downloads
```

### 搜索引擎可找到
- Google 搜索结果前 3 页出现
- 百度搜索前 5 页出现

---

## 📝 用户安装指南

### 方法 1: ClawHub 安装（推荐）

```bash
# 安装
npx clawhub install evoindex-2-0

# 验证
npx clawhub list

# 使用
# 在对话中提及 "EvoIndex" 或 "意图识别" 自动触发
```

### 方法 2: GitHub 下载

```bash
# 克隆仓库
git clone https://github.com/yourusername/EvoIndex-2.0.git

# 安装依赖
cd EvoIndex-2.0
npm install

# 运行测试
node test/intent_classifier_test.mjs
```

---

## 🔄 更新维护

### 版本更新流程

1. 修改 `SKILL.md` 中的版本号
2. 更新 `CHANGELOG.md`
3. 打包新版本
4. 发布到 ClawHub（自动版本管理）
5. 创建 GitHub Release

### 用户更新

```bash
# 更新已安装的技能
npx clawhub update evoindex-2-0
```

---

## 💡 推广建议

1. **ClawHub 社区推广**
   - 在 ClawHub Discord 分享
   - 参与 ClawHub 技能市场推荐

2. **技术社区推广**
   - 知乎专栏文章
   - CSDN 技术博客
   - 掘金技术文章

3. **社交媒体**
   - Twitter/X 分享
   - 微信公众号文章

---

**发布负责人**: 耗电马喽  
**预计完成时间**: 2026-03-16 14:00  
**状态**: 准备就绪，等待执行
