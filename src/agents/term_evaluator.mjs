#!/usr/bin/env node
/**
 * 术语质量评估器 - 使用 LLM 评估术语质量
 * 评分标准：1-5 分，只保留>=4 分的术语
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// 简化的 LLM 客户端（使用 Bailian API）
async function evaluateTermWithLLM(term, context, domain = 'general') {
  const prompt = `
# 任务
评估以下术语是否为高质量专业术语。

# 输入
术语：${term}
领域：${domain}
上下文：${context.substring(0, 200)}...

# 评分标准
- **5 分**: 核心专业术语（如"肺结节"、"LoRA 微调"）
  - 领域特异性强
  - 不可替代
  - 高频使用
  
- **4 分**: 重要相关术语（如"CT 影像"、"模型量化"）
  - 领域相关
  - 较为专业
  - 中等频率
  
- **3 分**: 一般术语（如"检测"、"优化"）
  - 跨领域通用
  - 专业性一般
  - 低频使用
  
- **2 分**: 通用词汇（如"方法"、"技术"）
  - 高度通用
  - 无专业性
  
- **1 分**: 停用词（如"的"、"了"、"是"）
  - 无实际意义

# 输出格式
严格返回 JSON 格式：
{
  "score": 1-5,
  "category": "core/related/general/stopword",
  "reason": "简短理由（20 字以内）",
  "suggested_weight": 0.5-1.5
}
`;

  try {
    // 使用 Bailian API（简化版）
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY || 'sk-fa69a977b8ea4077bd7232fc7cf60fe7'}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: {
          messages: [
            {
              role: 'system',
              content: '你是一个专业术语评估专家。严格返回 JSON 格式，不要额外说明。'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        parameters: {
          result_format: 'message',
          temperature: 0.3
        }
      })
    });
    
    const data = await response.json();
    
    if (data.output && data.output.choices && data.output.choices[0]) {
      const content = data.output.choices[0].message.content;
      // 提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
    
    // 降级：返回默认评估
    return {
      score: 3,
      category: 'general',
      reason: 'LLM 解析失败，默认评分',
      suggested_weight: 0.8
    };
    
  } catch (error) {
    console.error(`  ⚠️  LLM 评估失败：${error.message}`);
    return {
      score: 3,
      category: 'general',
      reason: 'API 错误，默认评分',
      suggested_weight: 0.8
    };
  }
}

// 基于规则的快速评估（无需 LLM）
function evaluateTermWithRules(term, frequency, docCount, domain) {
  let score = 3;
  let category = 'general';
  let reason = '';
  let suggestedWeight = 0.8;
  
  // 规则 1: 长度检查
  if (term.length < 2) {
    score = 1;
    category = 'stopword';
    reason = '术语过短';
    suggestedWeight = 0.3;
    return { score, category, reason, suggestedWeight };
  }
  
  // 规则 2: 停用词检查
  const stopwords = ['的', '了', '是', '在', '和', '与', '或', '等', '之', '一个', '一些'];
  if (stopwords.includes(term)) {
    score = 1;
    category = 'stopword';
    reason = '停用词';
    suggestedWeight = 0.3;
    return { score, category, reason, suggestedWeight };
  }
  
  // 规则 3: 英文术语检查
  if (/^[a-zA-Z]+$/.test(term)) {
    if (term.length >= 3 && frequency >= 3) {
      score = 4;
      category = 'related';
      reason = '专业英文术语';
      suggestedWeight = 1.0;
      return { score, category, reason, suggestedWeight };
    }
  }
  
  // 规则 4: 领域特异性术语
  const domainKeywords = {
    'medical_ai': ['肺', '眼底', 'CT', 'MRI', '影像', '筛查', '检测', '诊断', '病变'],
    'llm': ['LoRA', '微调', '量化', '推理', '部署', 'vLLM', '模型', '显存'],
    'legal_tech': ['合同', '诉讼', '法律', '审查', '风险', '合规'],
    'fintech': ['金融', '风险', '信用', '评估', '量化', '交易'],
    'ai_tech': ['AI', '人工智能', '神经网络', '深度学习', '算法']
  };
  
  const keywords = domainKeywords[domain] || [];
  const hasDomainKeyword = keywords.some(kw => term.includes(kw));
  
  if (hasDomainKeyword && frequency >= 3) {
    score = 5;
    category = 'core';
    reason = '领域核心术语';
    suggestedWeight = 1.2;
  } else if (hasDomainKeyword) {
    score = 4;
    category = 'related';
    reason = '领域相关术语';
    suggestedWeight = 1.0;
  } else if (frequency >= 5 && docCount >= 2) {
    score = 4;
    category = 'related';
    reason = '高频跨领域术语';
    suggestedWeight = 0.9;
  } else if (frequency >= 3) {
    score = 3;
    category = 'general';
    reason = '一般术语';
    suggestedWeight = 0.8;
  } else {
    score = 2;
    category = 'general';
    reason = '低频术语';
    suggestedWeight = 0.5;
  }
  
  return { score, category, reason, suggestedWeight };
}

// 批量评估术语
async function batchEvaluateTerms(terms, useLLM = false, output_path = null) {
  console.log(`\n🤖 开始评估 ${terms.length} 个术语...`);
  console.log(`   评估模式：${useLLM ? 'LLM + 规则' : '仅规则'}`);
  
  const results = [];
  const stats = {
    core: 0,
    related: 0,
    general: 0,
    stopword: 0
  };
  
  for (let i = 0; i < terms.length; i++) {
    const termData = terms[i];
    const term = termData.term || termData;
    
    // 显示进度
    if ((i + 1) % 10 === 0 || i === 0) {
      process.stdout.write(`\r   进度：${i + 1}/${terms.length}`);
    }
    
    let evaluation;
    
    if (useLLM) {
      // LLM 评估（慢，但更准确）
      const context = termData.source_files ? termData.source_files.join(', ') : '';
      const domain = termData.domains ? termData.domains[0] : 'general';
      evaluation = await evaluateTermWithLLM(term, context, domain);
    } else {
      // 规则评估（快）
      const frequency = termData.total_frequency || termData.frequency || 1;
      const docCount = termData.doc_count || 1;
      const domain = termData.domains ? termData.domains[0] : 'general';
      evaluation = evaluateTermWithRules(term, frequency, docCount, domain);
    }
    
    results.push({
      term: term,
      ...termData,
      ...evaluation
    });
    
    stats[evaluation.category]++;
  }
  
  console.log('\n');
  
  // 统计
  console.log('📊 评估统计:');
  console.log(`   核心术语 (5 分): ${stats.core} 个`);
  console.log(`   相关术语 (4 分): ${stats.related} 个`);
  console.log(`   一般术语 (3 分): ${stats.general} 个`);
  console.log(`   停用词 (1-2 分): ${stats.stopword} 个`);
  
  // 筛选：只保留 score >= 4 的术语
  const filtered = results.filter(r => r.score >= 4);
  console.log(`\n✅ 筛选后保留：${filtered.length}/${results.length} 个术语 (${(filtered.length / results.length * 100).toFixed(1)}%)`);
  
  // 保存结果
  if (output_path) {
    writeFileSync(output_path, JSON.stringify({
      timestamp: new Date().toISOString(),
      total_terms: results.length,
      filtered_terms: filtered.length,
      stats,
      terms: filtered.sort((a, b) => b.score - a.score || b.avg_weight - a.avg_weight)
    }, null, 2), 'utf-8');
    
    console.log(`\n📄 结果已保存：${output_path}`);
  }
  
  return filtered;
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('用法:');
    console.log('  node term_evaluator.mjs <input.json> [output.json] [--llm]');
    console.log('  node term_evaluator.mjs test');
    process.exit(0);
  }
  
  if (args[0] === 'test') {
    // 测试
    const testTerms = [
      { term: '肺结节', total_frequency: 15, doc_count: 3, domains: ['medical_ai'] },
      { term: 'LoRA 微调', total_frequency: 12, doc_count: 2, domains: ['llm'] },
      { term: '检测', total_frequency: 8, doc_count: 5, domains: ['medical_ai'] },
      { term: '的', total_frequency: 100, doc_count: 10, domains: ['general'] },
      { term: '方法', total_frequency: 5, doc_count: 3, domains: ['general'] }
    ];
    
    console.log('🧪 测试评估:\n');
    const results = await batchEvaluateTerms(testTerms, false);
    
    console.log('\n📖 评估结果:');
    results.forEach(r => {
      console.log(`  ${r.term}: ${r.score}分 (${r.category}) - ${r.reason}`);
    });
    
    return;
  }
  
  // 加载术语文件
  const inputPath = args[0];
  const outputPath = args.find(a => a.endsWith('.json') && a !== inputPath);
  const useLLM = args.includes('--llm');
  
  console.log(`📖 读取术语文件：${inputPath}`);
  const data = JSON.parse(readFileSync(inputPath, 'utf-8'));
  const terms = data.terms || data;
  
  // 批量评估
  const filtered = await batchEvaluateTerms(terms, useLLM, outputPath);
  
  console.log('\n✅ 评估完成！');
}

main().catch(console.error);

// 导出函数供测试使用
export { evaluateTermWithLLM, evaluateTermWithRules, batchEvaluateTerms };
