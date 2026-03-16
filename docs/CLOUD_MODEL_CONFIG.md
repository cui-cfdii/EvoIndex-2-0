# PageIndex-CN 云端模型配置指南

## 🎯 目标
确保在切换到云端模型后，召回率保持在 **92% 以上**。

## 📋 环境配置

### 1. 设置环境变量

#### Windows PowerShell
```powershell
$env:LLM_MODE="cloud"
$env:DASHSCOPE_API_KEY="sk-fa69a977b8ea4077bd7232fc7cf60fe7"
$env:LLM_MODEL="qwen3.5-plus"
```

#### Windows CMD
```cmd
set LLM_MODE=cloud
set DASHSCOPE_API_KEY=sk-fa69a977b8ea4077bd7232fc7cf60fe7
set LLM_MODEL=qwen3.5-plus
```

#### Linux/macOS
```bash
export LLM_MODE=cloud
export DASHSCOPE_API_KEY="sk-fa69a977b8ea4077bd7232fc7cf60fe7"
export LLM_MODEL="qwen3.5-plus"
```

### 2. 模型选择

**推荐模型**：
- `qwen3.5-plus` - 通义千问 3.5 Plus（当前使用）
- `qwen-turbo` - 通义千问 Turbo（更快、更便宜）
- `qwen-max` - 通义千问 Max（最强性能）

**性能对比**：
| 模型 | 速度 | 成本 | 准确率 | 推荐场景 |
|------|------|------|--------|----------|
| qwen3.5-plus | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 平衡性能和成本 |
| qwen-turbo | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 快速测试 |
| qwen-max | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | 高精度要求 |

## 🧪 测试验证

### 1. 运行召回率测试
```bash
cd PageIndex-CN
npm run test:recall
```

### 2. 运行完整测试
```bash
npm test
```

### 3. 构建增强索引
```bash
# 使用云端模型构建索引
node src/index.mjs build data/test_documents/chinese_ai_report.md index.json

# 增强索引（实体关系提取 + 社区检测）
node src/index.mjs enhance index.json enhanced_index.json

# 查询测试
node src/index.mjs query "中国 AI 发展历程" enhanced_index.json
```

## 📊 性能指标

### 目标指标
- **召回率**: >= 92%
- **准确率**: >= 85%
- **查询延迟**: < 200ms
- **多样性**: >= 75%

### 测试数据集
1. `chinese_ai_report.md` - 中国人工智能发展报告（约 2.4KB）
2. `open_source_llm_guide.md` - 开源大模型技术指南（约 4.3KB）
3. `test_document.md` - 基础测试文档（约 1.2KB）

### 测试查询
1. 中国 AI 发展历程
2. 计算机视觉技术应用
3. 开源大模型部署方案
4. LoRA 微调方法
5. 智慧城市应用案例

## 🔧 优化建议

### 如果召回率 < 92%

1. **调整检索权重**
   ```javascript
   const weights = {
     title: 0.5,      // 增加标题匹配权重
     entity: 0.3,     // 实体关系权重
     community: 0.2   // 社区相关性权重
   };
   ```

2. **优化查询预处理**
   - 添加同义词扩展
   - 关键词提取优化
   - 查询重写

3. **增加索引密度**
   - 更细粒度的章节划分
   - 增加实体提取数量
   - 丰富社区摘要

4. **切换更强模型**
   - 从 `qwen3.5-plus` 升级到 `qwen-max`
   - 或从 `qwen-turbo` 升级到 `qwen3.5-plus`

## 📝 注意事项

1. **API 成本**：云端模型调用会产生费用，注意监控用量
2. **网络延迟**：云端模型受网络影响，查询延迟可能略高
3. **数据隐私**：敏感数据建议使用本地模型
4. **速率限制**：注意 API 调用频率限制

## ✅ 验收标准

- [ ] 召回率 >= 92%
- [ ] 所有测试用例通过
- [ ] 查询延迟 < 200ms
- [ ] 文档完整更新
- [ ] 配置脚本可用

---

**更新**: 2026-03-13
**作者**: 耗电马喽 🐎⚡
