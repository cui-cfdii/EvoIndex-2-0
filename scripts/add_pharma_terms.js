#!/usr/bin/env node
/**
 * 添加药品监管术语到字典
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dictFile = path.join(__dirname, '..', 'data', 'optimized_dictionary.json');

// 药品监管相关术语
const pharmaTerms = [
  // 法规名称
  { term: "药品管理法", weight: 2.0 },
  { term: "GMP", weight: 2.0 },
  { term: "药品生产质量管理规范", weight: 2.0 },
  { term: "GCP", weight: 2.0 },
  { term: "GLP", weight: 2.0 },
  { term: "GSP", weight: 2.0 },
  { term: "GVP", weight: 2.0 },
  { term: "ICH", weight: 1.8 },
  { term: "NMPA", weight: 2.0 },
  { term: "CDE", weight: 1.8 },
  { term: "FDA", weight: 1.8 },
  
  // 原料相关
  { term: "原料药", weight: 2.0 },
  { term: "辅料", weight: 1.8 },
  { term: "包材", weight: 1.5 },
  { term: "不合格原料", weight: 2.5 },
  { term: "原料检验", weight: 2.0 },
  { term: "原料供应商", weight: 1.8 },
  
  // 违规处罚
  { term: "行政处罚", weight: 1.8 },
  { term: "刑事责任", weight: 1.8 },
  { term: "罚款", weight: 1.5 },
  { term: "吊销", weight: 1.8 },
  { term: "责令停产", weight: 2.0 },
  { term: "违法", weight: 1.5 },
  { term: "违规", weight: 1.5 },
  { term: "假药", weight: 2.0 },
  { term: "劣药", weight: 2.0 },
  
  // 生产相关
  { term: "药品生产", weight: 1.8 },
  { term: "质量管理体系", weight: 1.8 },
  { term: "偏差", weight: 1.5 },
  { term: "CAPA", weight: 1.5 },
  { term: "确认验证", weight: 1.5 },
  
  // 临床试验
  { term: "临床试验", weight: 1.8 },
  { term: "IND", weight: 1.5 },
  { term: "NDA", weight: 1.5 },
  { term: "ANDA", weight: 1.5 },
  
  // 注册申报
  { term: "药品注册", weight: 2.0 },
  { term: "批准文号", weight: 1.8 },
  { term: "注册申报", weight: 1.8 },
  
  // 监管
  { term: "药品监管", weight: 1.8 },
  { term: "飞行检查", weight: 1.5 },
  { term: "召回", weight: 1.5 },
  { term: "不良反应", weight: 1.5 },
];

// 读取现有字典
const dict = JSON.parse(fs.readFileSync(dictFile, 'utf-8'));

// 添加新术语
let addedCount = 0;
for (const term of pharmaTerms) {
  // 检查是否已存在
  const exists = dict.dictionary.some(t => t.term === term.term);
  if (!exists) {
    dict.dictionary.push(term);
    addedCount++;
  }
}

console.log(`✅ 添加了 ${addedCount} 个药品监管术语`);

// 保存更新后的字典
fs.writeFileSync(dictFile, JSON.stringify(dict, null, 2), 'utf-8');
console.log(`✅ 已更新字典: ${dictFile}`);
console.log(`   字典总条目: ${dict.dictionary.length}`);