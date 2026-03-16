#!/usr/bin/env node
/**
 * 重建 P1.2 的 43 个术语词典
 * 基于 jieba_tokenizer.py 的 CUSTOM_DICT + 一些扩展
 */

import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// P1.2 的 43 个核心术语（从 jieba_tokenizer.py 的 CUSTOM_DICT 提取）
const p12Terms = [
  // AI 基础术语
  '人工智能', 'AI', '大模型', 'LLM', '深度学习',
  '机器学习', '神经网络', '自然语言处理', 'NLP',
  '计算机视觉', 'CV', '图像识别', '目标检测',
  '开源', '部署', '微调', 'fine-tuning', 'LoRA',
  '智慧城市', '智能城市', '城市大脑',
  '发展历程', '演进', '里程碑',
  '应用场景', '落地', '案例',
  '检索', '召回率', '准确率', 'RAG',
  '索引', '查询', '检索引擎',
  'Qwen', '通义千问', '百度', '阿里', '腾讯',
  'LM Studio', 'Ollama', 'vLLM', 'ModelScope',
  // 新增专业术语（从医疗和法律文本中提取）
  '肺结节', '眼底', '筛查', '检测', 'CT', 'MRI',
  '糖尿病', '视网膜', '病变'
];

const dictWithWeights = p12Terms.map((term, i) => ({
  term: term,
  weight: 1.0, // 所有术语权重相同
  frequency: 0 // 未知频率
}));

const dictData = {
  version: 'v5-p12-43terms-backup',
  timestamp: new Date().toISOString(),
  dictionary: dictWithWeights,
  notes: 'P1.2 验证过的 43 个核心术语，权重均为 1.0'
};

const PROJECT_ROOT = join(__dirname, '..');
const outputPath = join(PROJECT_ROOT, 'data', 'optimized_dictionary.json');
writeFileSync(outputPath, JSON.stringify(dictData, null, 2), 'utf-8');

console.log(`✅ P1.2 词典已重建: ${outputPath}`);
console.log(`术语数量: ${p12Terms.length}`);
console.log('高权重术语:');
p12Terms.forEach(term => console.log(`   ${term}: 1.000`));
