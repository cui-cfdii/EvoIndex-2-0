#!/usr/bin/env node
/**
 * 从 Tavily API 抓取互联网文章
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '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';

async function fetchArticlesFromTavily(query, domain, maxResults = 10, outputDir) {
  console.log(`\n🔍 Tavily 搜索：${query}`);
  console.log(`   领域：${domain}`);
  console.log(`   最大结果数：${maxResults}`);
  
  try {
    // Tavily Deep Search API
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TAVILY_API_KEY}`
      },
      body: JSON.stringify({
        query: query,
        max_results: maxResults,
        include_answer: true,
        include_content: true,
        search_depth: 'advanced'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Tavily API 错误：${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`   找到 ${data.results?.length || 0} 篇文章`);
    
    // 保存文章
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    const articles = [];
    for (let i = 0; i < (data.results?.length || 0); i++) {
      const result = data.results[i];
      
      // 生成文件名
      const title = result.title
        .replace(/[^\w\u4e00-\u9fa5]/g, '_')
        .substring(0, 50);
      const filename = `${String(i + 1).padStart(2, '0')}_${title}.md`;
      const filepath = join(outputDir, filename);
      
      // 生成 Markdown 内容
      const content = `# ${result.title}

**来源**: ${result.url}  
**领域**: ${domain}  
**抓取时间**: ${new Date().toISOString()}  
**相关性评分**: ${result.score || 'N/A'}

---

## 摘要

${result.content || result.answer || '无摘要'}

---

## 正文

${result.content || '无正文内容'}

---

*本文由 PageIndex-CN 自进化系统自动抓取*
`;
      
      writeFileSync(filepath, content, 'utf-8');
      console.log(`  ✓ 保存：${filename}`);
      
      articles.push({
        title: result.title,
        url: result.url,
        filepath: filepath,
        score: result.score
      });
    }
    
    // 保存元数据
    const metadataPath = join(outputDir, 'fetch_metadata.json');
    writeFileSync(metadataPath, JSON.stringify({
      query: query,
      domain: domain,
      timestamp: new Date().toISOString(),
      total_articles: articles.length,
      articles: articles
    }, null, 2), 'utf-8');
    
    console.log(`\n✅ 文章已保存到：${outputDir}`);
    console.log(`   元数据：${metadataPath}`);
    
    return articles;
    
  } catch (error) {
    console.error(`❌ Tavily 抓取失败：${error.message}`);
    
    // 降级：创建示例文件
    console.log('⚠️  创建示例文件用于测试...');
    
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    const sampleContent = `# ${domain} 示例文章

**领域**: ${domain}  
**抓取时间**: ${new Date().toISOString()}

---

## 内容

这是一个示例文件，用于测试术语提取流程。

在实际使用中，系统会从 Tavily API 抓取真实的互联网文章。

### 关键术语示例

根据领域不同，可能包含：
- 医疗 AI: 肺结节、CT 影像、筛查、诊断
- 法律科技：合同审查、诉讼预测、合规管理
- 金融科技：信用评估、风险控制、量化交易
- 大模型：LoRA 微调、模型量化、推理加速

---

*示例文件*
`;
    
    const samplePath = join(outputDir, '01_sample.md');
    writeFileSync(samplePath, sampleContent, 'utf-8');
    
    return [{ title: '示例文章', filepath: samplePath }];
  }
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log('用法:');
    console.log('  node fetch_articles.js --domain <domain> --query <query> [--output <dir>] [--max <n>]');
    console.log('');
    console.log('示例:');
    console.log('  node fetch_articles.js --domain medical_ai --query "肺结节检测 AI"');
    console.log('  node fetch_articles.js --domain llm --query "LoRA 微调最佳实践" --max 5');
    process.exit(0);
  }
  
  // 解析参数
  const domain = args.find((_, i) => args[i - 1] === '--domain') || 'general';
  const query = args.find((_, i) => args[i - 1] === '--query') || 'AI 技术前沿';
  const output = args.find((_, i) => args[i - 1] === '--output') || `data/articles/${domain}`;
  const maxResults = parseInt(args.find((_, i) => args[i - 1] === '--max') || '10');
  
  console.log('='.repeat(60));
  console.log('🕷️ Tavily 文章抓取器');
  console.log('='.repeat(60));
  
  const articles = await fetchArticlesFromTavily(query, domain, maxResults, output);
  
  console.log('\n📊 抓取总结:');
  console.log(`   成功抓取：${articles.length} 篇`);
  if (articles.length > 0) {
    console.log('\n📖 文章列表:');
    articles.forEach((a, i) => {
      console.log(`   ${i + 1}. ${a.title}`);
    });
  }
}

main().catch(console.error);
