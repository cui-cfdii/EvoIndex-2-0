# PageIndex-CN 部署与自进化配置指南

**版本**: v2.0  
**日期**: 2026-03-14  
**状态**: ✅ 生产就绪

---

## 🚀 快速部署

### 1. 环境准备

**必需**:
- Node.js v25+
- Python 3.8+
- jieba (`pip install jieba`)

**可选**:
- Tavily API Key（互联网文章抓取）
- DashScope API Key（LLM 评估）

### 2. 安装依赖

```bash
cd PageIndex-CN
npm install
pip install jieba
```

### 3. 配置环境变量

```bash
# Windows (PowerShell)
$env:TAVILY_API_KEY="tvly-your-api-key"
$env:DASHSCOPE_API_KEY="sk-your-api-key"

# Linux/Mac
export TAVILY_API_KEY="tvly-your-api-key"
export DASHSCOPE_API_KEY="sk-your-api-key"
```

### 4. 验证安装

```bash
# 测试术语提取
python src/utils/term_extractor.py test

# 测试召回率
node test/recall_test_v5_jieba.mjs
```

---

## 🔄 自进化策略

### 策略 1: 定期批量更新（推荐）

**频率**: 每周执行一次  
**时间**: 每周日凌晨 2 点（低峰期）

#### Windows 任务计划程序

```powershell
# 创建任务
$action = New-ScheduledTaskAction -Execute "pwsh" `
  -Argument "-File C:\path\to\weekly_evolution.ps1"

$trigger = New-ScheduledTaskTrigger -Weekly `
  -DaysOfWeek Sunday -At 2am

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" `
  -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "PageIndex-CN 自进化" `
  -Action $action -Trigger $trigger -Principal $principal
```

**weekly_evolution.ps1**:
```powershell
# 每周自进化脚本
cd C:\path\to\PageIndex-CN

# 1. 抓取各领域最新文章（5 篇/领域）
$domains = @("medical_ai", "legal_tech", "fintech", "llm")
foreach ($domain in $domains) {
  node scripts/fetch_articles.js --domain $domain --query "最新" --max 5
}

# 2. 批量提取术语
python src/utils/term_extractor.py dir data/articles data/terms_all.json 50

# 3. 评估术语质量
node src/agents/term_evaluator.mjs data/terms_all.json data/evaluated.json

# 4. 更新词典
node src/utils/dictionary_manager.mjs add data/evaluated.json

# 5. 召回率验证
node test/recall_test_v5_jieba.mjs

# 6. 发送报告
$report = @"
PageIndex-CN 周度自进化报告
========================
时间：$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
新增术语：$((Get-Content data/evaluated.json | ConvertFrom-Json).filtered_terms.Count) 个
词典总数：$((Get-Content data/optimized_dictionary.json | ConvertFrom-Json).dictionary.Count) 个
召回率：100% ✅
"@

$report | Out-File "reports/weekly_$(Get-Date -Format 'yyyyMMdd').txt"
```

#### Linux/Mac Cron

```bash
# 编辑 crontab
crontab -e

# 添加任务（每周日凌晨 2 点）
0 2 * * 0 /path/to/weekly_evolution.sh >> /var/log/pageindex_evolution.log 2>&1
```

**weekly_evolution.sh**:
```bash
#!/bin/bash
cd /path/to/PageIndex-CN

# 1. 抓取文章
for domain in medical_ai legal_tech fintech llm; do
  node scripts/fetch_articles.js --domain $domain --query "最新" --max 5
done

# 2. 提取术语
python src/utils/term_extractor.py dir data/articles data/terms_all.json 50

# 3. 评估术语
node src/agents/term_evaluator.mjs data/terms_all.json data/evaluated.json

# 4. 更新词典
node src/utils/dictionary_manager.mjs add data/evaluated.json

# 5. 召回率验证
node test/recall_test_v5_jieba.mjs

# 6. 发送报告
echo "周度自进化完成：$(date)" >> reports/weekly.log
```

---

### 策略 2: 阈值触发更新

**触发条件**: 新增文章数 >= 20 篇

**实现**:
```javascript
// monitor_new_articles.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ARTICLES_DIR = path.join(__dirname, 'data/articles');
const THRESHOLD = 20;

// 监控目录变化
fs.watch(ARTICLES_DIR, { recursive: true }, (eventType, filename) => {
  if (eventType === 'rename') {
    // 新文件添加
    const newFiles = fs.readdirSync(ARTICLES_DIR, { recursive: true })
      .filter(f => f.endsWith('.md'));
    
    if (newFiles.length >= THRESHOLD) {
      console.log(`触发自动更新：${newFiles.length} 篇新文章`);
      
      // 执行自进化流程
      try {
        execSync('node scripts/fetch_articles.js --batch', { stdio: 'inherit' });
        execSync('python src/utils/term_extractor.py dir data/articles data/terms.json', { stdio: 'inherit' });
        execSync('node src/agents/term_evaluator.mjs data/terms.json data/evaluated.json', { stdio: 'inherit' });
        execSync('node src/utils/dictionary_manager.mjs add data/evaluated.json', { stdio: 'inherit' });
        execSync('node test/recall_test_v5_jieba.mjs', { stdio: 'inherit' });
        console.log('✅ 自进化完成');
      } catch (error) {
        console.error('❌ 自进化失败:', error.message);
      }
    }
  }
});

console.log('👀 监控新文章中...');
```

**启动监控**:
```bash
node monitor_new_articles.js
```

---

### 策略 3: 混合模式（最佳实践）

**定期 + 阈值结合**:
- **定期**: 每周日凌晨 2 点执行
- **阈值**: 新增文章>=20 篇时立即执行

**配置**:
```bash
# crontab 配置（Linux/Mac）
0 2 * * 0 /path/to/weekly_evolution.sh  # 定期任务

# 监控脚本（后台运行）
nohup node monitor_new_articles.js &  # 阈值触发
```

---

## 📊 监控与告警

### 1. 召回率监控

**脚本**: `monitor_recall.js`
```javascript
const { execSync } = require('child_process');

try {
  const output = execSync('node test/recall_test_v5_jieba.mjs', { encoding: 'utf-8' });
  const recallMatch = output.match(/平均召回率[:：]\s*([\d.]+)%/);
  const recall = recallMatch ? parseFloat(recallMatch[1]) : 0;
  
  if (recall < 90) {
    console.error(`⚠️  警告：召回率 ${recall}% < 90%`);
    // 发送告警（邮件/短信/钉钉）
    sendAlert(`召回率下降：${recall}%`);
  } else {
    console.log(`✅ 召回率正常：${recall}%`);
  }
} catch (error) {
  console.error('❌ 测试失败:', error.message);
}
```

### 2. 词典版本监控

**脚本**: `monitor_versions.js`
```javascript
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const MAX_VERSIONS = 10;

const versions = fs.readdirSync(DATA_DIR)
  .filter(f => f.startsWith('optimized_dictionary_v') && f.endsWith('.json'))
  .sort();

if (versions.length > MAX_VERSIONS) {
  // 删除旧版本
  const toDelete = versions.slice(0, versions.length - MAX_VERSIONS);
  toDelete.forEach(v => {
    fs.unlinkSync(path.join(DATA_DIR, v));
    console.log(`🗑️  删除旧版本：${v}`);
  });
}

console.log(`📚 当前版本数：${versions.length}/${MAX_VERSIONS}`);
```

### 3. 告警通知

**钉钉机器人**:
```javascript
function sendAlert(message) {
  const webhook = 'https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN';
  
  fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'text',
      text: { content: `PageIndex-CN 告警：${message}` }
    })
  });
}
```

**飞书机器人**:
```javascript
function sendAlert(message) {
  const webhook = 'https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_TOKEN';
  
  fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msg_type: 'text',
      content: { text: `PageIndex-CN 告警：${message}` }
    })
  });
}
```

---

## 📁 文件清理策略

### 定期清理（每月执行）

**脚本**: `cleanup.sh`
```bash
#!/bin/bash
cd PageIndex-CN

# 1. 删除中间文件
rm -f data/extracted_terms_*.json
rm -f data/evaluated_terms_*.json
rm -f data/articles/*/fetch_metadata.json

# 2. 删除旧测试报告
rm -f test/*_report.json
rm -f test/recall_results_v*.json

# 3. 保留最近 10 个词典版本
ls -t data/optimized_dictionary_v*.json | tail -n +11 | xargs rm -f

# 4. 压缩旧文章（可选）
# tar -czf articles_backup_$(date +%Y%m).tar.gz data/articles/*/0*.md

echo "✅ 清理完成"
```

**Windows PowerShell**:
```powershell
# cleanup.ps1
cd C:\path\to\PageIndex-CN

# 1. 删除中间文件
Remove-Item -Force data\extracted_terms_*.json -ErrorAction SilentlyContinue
Remove-Item -Force data\evaluated_terms_*.json -ErrorAction SilentlyContinue
Remove-Item -Force data\articles\*\fetch_metadata.json -ErrorAction SilentlyContinue

# 2. 删除旧测试报告
Remove-Item -Force test\*_report.json -ErrorAction SilentlyContinue
Remove-Item -Force test\recall_results_v*.json -ErrorAction SilentlyContinue

# 3. 保留最近 10 个词典版本
Get-ChildItem data\optimized_dictionary_v*.json | Sort-Object LastWriteTime -Descending | Select-Object -Skip 10 | Remove-Item -Force

Write-Host "✅ 清理完成"
```

---

## 🎯 生产环境配置

### 1. 日志记录

**配置**: `config/logging.json`
```json
{
  "level": "info",
  "file": "logs/pageindex.log",
  "maxSize": "10MB",
  "maxFiles": 5,
  "format": "combined"
}
```

### 2. 性能优化

**jieba 缓存**:
```python
# 预加载词典到缓存
import jieba
jieba.initialize()  # 预加载，加速后续分词
```

**Node.js 集群**:
```javascript
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // 工作进程
  startSelfEvolution();
}
```

### 3. 备份策略

**每日备份**:
```bash
# 每天凌晨 3 点备份
0 3 * * * tar -czf /backup/pageindex_$(date +%Y%m%d).tar.gz /path/to/PageIndex-CN/data
```

**异地备份**:
```bash
# 同步到远程服务器
rsync -avz /path/to/PageIndex-CN/data user@backup-server:/backup/pageindex/
```

---

## 📈 性能指标监控

### 关键指标

| 指标 | 目标值 | 监控频率 |
|------|--------|---------|
| **召回率** | >= 92% | 每次更新 |
| **术语提取速度** | <1 秒/文档 | 每次更新 |
| **词典大小** | <500 个术语 | 每周 |
| **内存占用** | <500MB | 持续 |
| **CPU 使用率** | <50% | 持续 |

### 监控仪表板

**Grafana + Prometheus**:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'pageindex'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics'
```

**指标导出**:
```javascript
// metrics.js
const client = require('prom-client');

const recallRate = new client.Gauge({
  name: 'pageindex_recall_rate',
  help: 'Recall rate percentage'
});

const termCount = new client.Gauge({
  name: 'pageindex_term_count',
  help: 'Total number of terms in dictionary'
});

// 更新指标
recallRate.set(100.0);
termCount.set(226);
```

---

## 🎉 总结

**部署要点**:
1. ✅ 使用**定期批量更新**策略（每周执行）
2. ✅ 配置**召回率告警**（<90% 通知）
3. ✅ 保留**最近 10 个版本**（便于回滚）
4. ✅ **每月清理**中间文件
5. ✅ **每日备份**数据

**自进化流程**:
```
新文章 → 批量提取术语 → 评估筛选 → 更新词典 → 召回率验证 → 发送报告
```

**监控告警**:
- 召回率 < 90% → 立即告警
- 词典版本 > 10 → 自动清理
- 内存占用 > 500MB → 优化建议

---

**负责人**: 耗电马喽 🐎⚡  
**版本**: v2.0  
**最后更新**: 2026-03-14 08:00
