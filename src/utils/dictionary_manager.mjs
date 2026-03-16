#!/usr/bin/env node
/**
 * 词典管理器 - 版本管理、更新、回滚
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');
const DATA_DIR = join(PROJECT_ROOT, 'data');

/**
 * 加载当前词典
 */
function loadCurrentDictionary() {
  const dictPath = join(DATA_DIR, 'optimized_dictionary.json');
  
  if (!existsSync(dictPath)) {
    throw new Error('当前词典不存在：' + dictPath);
  }
  
  return JSON.parse(readFileSync(dictPath, 'utf-8'));
}

/**
 * 保存新词典版本
 */
function saveDictionaryVersion(dictData, version = null) {
  if (!version) {
    // 自动生成版本号
    const match = dictData.version?.match(/v(\d+)/);
    const currentVersion = match ? parseInt(match[1]) : 0;
    version = `v${currentVersion + 1}`;
  }
  
  dictData.version = version;
  dictData.timestamp = new Date().toISOString();
  
  const versionPath = join(DATA_DIR, `optimized_dictionary_${version}.json`);
  writeFileSync(versionPath, JSON.stringify(dictData, null, 2), 'utf-8');
  
  // 同时更新主词典
  const mainPath = join(DATA_DIR, 'optimized_dictionary.json');
  writeFileSync(mainPath, JSON.stringify(dictData, null, 2), 'utf-8');
  
  console.log(`✅ 词典已保存：${versionPath}`);
  return versionPath;
}

/**
 * 添加新术语到词典
 */
function addNewTerms(newTerms, currentDict = null) {
  if (!currentDict) {
    currentDict = loadCurrentDictionary();
  }
  
  const existingTerms = new Set(currentDict.dictionary.map(d => d.term));
  const added = [];
  const skipped = [];
  
  for (const termData of newTerms) {
    const term = typeof termData === 'string' ? termData : termData.term;
    
    if (existingTerms.has(term)) {
      skipped.push(term);
      continue;
    }
    
    // 添加新术语
    currentDict.dictionary.push({
      term: term,
      weight: termData.suggested_weight || termData.avg_weight || 1.0,
      frequency: termData.total_frequency || termData.frequency || 0,
      domain: termData.domains ? termData.domains[0] : 'general',
      added_at: new Date().toISOString(),
      score: termData.score || 4
    });
    
    added.push(term);
  }
  
  console.log(`\n📊 术语更新统计:`);
  console.log(`   新增：${added.length} 个`);
  console.log(`   跳过（已存在）: ${skipped.length} 个`);
  console.log(`   词典总数：${currentDict.dictionary.length} 个`);
  
  if (added.length > 0) {
    console.log(`\n📖 新增术语 Top 10:`);
    added.slice(0, 10).forEach(term => {
      const data = currentDict.dictionary.find(d => d.term === term);
      console.log(`   - ${term}: 权重=${data.weight.toFixed(3)}, 领域=${data.domain}`);
    });
  }
  
  return { added, skipped, updated: currentDict };
}

/**
 * 回滚到指定版本
 */
function rollbackToVersion(version) {
  const versionPath = join(DATA_DIR, `optimized_dictionary_${version}.json`);
  
  if (!existsSync(versionPath)) {
    throw new Error(`版本不存在：${version}`);
  }
  
  const mainPath = join(DATA_DIR, 'optimized_dictionary.json');
  const backupPath = join(DATA_DIR, 'optimized_dictionary_backup_before_rollback.json');
  
  // 备份当前版本
  if (existsSync(mainPath)) {
    copyFileSync(mainPath, backupPath);
    console.log(`📦 已备份当前版本：${backupPath}`);
  }
  
  // 恢复指定版本
  copyFileSync(versionPath, mainPath);
  console.log(`✅ 已回滚到版本：${version}`);
  
  const versionData = JSON.parse(readFileSync(versionPath, 'utf-8'));
  console.log(`   术语数量：${versionData.dictionary.length}`);
  console.log(`   版本信息：${versionData.version}`);
  
  return versionData;
}

/**
 * 列出所有版本
 */
function listVersions() {
  const { readdirSync } = require('fs');
  
  const files = readdirSync(DATA_DIR)
    .filter(f => f.startsWith('optimized_dictionary_v') && f.endsWith('.json'))
    .sort();
  
  console.log('\n📚 词典版本列表:');
  for (const file of files) {
    const version = file.replace('optimized_dictionary_', '').replace('.json', '');
    const filePath = join(DATA_DIR, file);
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    const termCount = data.dictionary?.length || 0;
    const timestamp = data.timestamp ? new Date(data.timestamp).toLocaleString('zh-CN') : '未知';
    
    console.log(`  ${version}: ${termCount}个术语 - ${timestamp}`);
  }
  
  return files;
}

/**
 * 对比两个版本
 */
function compareVersions(version1, version2) {
  const path1 = join(DATA_DIR, `optimized_dictionary_${version1}.json`);
  const path2 = join(DATA_DIR, `optimized_dictionary_${version2}.json`);
  
  if (!existsSync(path1)) throw new Error(`版本不存在：${version1}`);
  if (!existsSync(path2)) throw new Error(`版本不存在：${version2}`);
  
  const dict1 = JSON.parse(readFileSync(path1, 'utf-8'));
  const dict2 = JSON.parse(readFileSync(path2, 'utf-8'));
  
  const terms1 = new Set(dict1.dictionary.map(d => d.term));
  const terms2 = new Set(dict2.dictionary.map(d => d.term));
  
  const added = [...terms2].filter(t => !terms1.has(t));
  const removed = [...terms1].filter(t => !terms2.has(t));
  
  console.log(`\n📊 版本对比：${version1} → ${version2}`);
  console.log(`   版本 1 术语数：${dict1.dictionary.length}`);
  console.log(`   版本 2 术语数：${dict2.dictionary.length}`);
  console.log(`   新增术语：${added.length} 个`);
  console.log(`   移除术语：${removed.length} 个`);
  
  if (added.length > 0) {
    console.log(`\n📖 新增术语:`);
    added.slice(0, 20).forEach(term => console.log(`   + ${term}`));
  }
  
  if (removed.length > 0) {
    console.log(`\n📖 移除术语:`);
    removed.slice(0, 20).forEach(term => console.log(`   - ${term}`));
  }
  
  return { added, removed };
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('用法:');
    console.log('  node dictionary_manager.mjs list                     - 列出所有版本');
    console.log('  node dictionary_manager.mjs add <terms.json>          - 添加新术语');
    console.log('  node dictionary_manager.mjs rollback <version>        - 回滚到指定版本');
    console.log('  node dictionary_manager.mjs compare <v1> <v2>         - 对比两个版本');
    console.log('  node dictionary_manager.mjs current                   - 显示当前词典信息');
    process.exit(0);
  }
  
  const command = args[0];
  
  try {
    if (command === 'list') {
      listVersions();
    }
    
    else if (command === 'add' && args[1]) {
      const termsPath = args[1];
      console.log(`📖 读取术语文件：${termsPath}`);
      const data = JSON.parse(readFileSync(termsPath, 'utf-8'));
      const terms = data.terms || data.filtered_terms || data;
      
      const currentDict = loadCurrentDictionary();
      const result = addNewTerms(terms, currentDict);
      
      // 保存新版本
      saveDictionaryVersion(result.updated);
    }
    
    else if (command === 'rollback' && args[1]) {
      const version = args[1];
      console.log(`🔄 回滚到版本：${version}`);
      rollbackToVersion(version);
    }
    
    else if (command === 'compare' && args[1] && args[2]) {
      compareVersions(args[1], args[2]);
    }
    
    else if (command === 'current') {
      const currentDict = loadCurrentDictionary();
      console.log('\n📊 当前词典信息:');
      console.log(`   版本：${currentDict.version}`);
      console.log(`   术语数量：${currentDict.dictionary.length}`);
      console.log(`   更新时间：${currentDict.timestamp || '未知'}`);
      
      console.log('\n📖 Top 20 高权重术语:');
      const sorted = [...currentDict.dictionary].sort((a, b) => b.weight - a.weight);
      sorted.slice(0, 20).forEach(d => {
        console.log(`   ${d.term}: ${d.weight.toFixed(3)} (领域：${d.domain || 'general'})`);
      });
    }
    
    else {
      console.log(`❌ 未知命令：${command}`);
      main();
    }
  } catch (error) {
    console.error(`❌ 错误：${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
