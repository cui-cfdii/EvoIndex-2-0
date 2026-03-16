#!/usr/bin/env node
/**
 * 自动权重优化器 - 运行召回率测试，自动调整 CMA-ES 权重
 */

import { readFileSync, writeFileSync, execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const TEST_DIR = join(PROJECT_ROOT, 'test');
const DATA_DIR = join(PROJECT_ROOT, 'data');

/**
 * 运行召回率测试
 */
function runRecallTest() {
  console.log('\n🧪 运行召回率测试...');
  
  try {
    const result = execSync(`node test/recall_test_v5_jieba.mjs`, {
      encoding: 'utf-8',
      cwd: PROJECT_ROOT,
      timeout: 120000 // 2 分钟超时
    });
    
    // 解析输出，提取召回率
    const recallMatch = result.match(/平均召回率[:：]\s*([\d.]+)%/);
    const recall = recallMatch ? parseFloat(recallMatch[1]) / 100 : 0;
    
    console.log(`   召回率：${(recall * 100).toFixed(1)}%`);
    
    return {
      success: true,
      recall: recall,
      passed: recall >= 0.92,
      output: result
    };
    
  } catch (error) {
    console.error(`   ❌ 测试失败：${error.message}`);
    return {
      success: false,
      recall: 0,
      passed: false,
      error: error.message
    };
  }
}

/**
 * 简化的 CMA-ES 权重优化
 */
async function optimizeWeightsWithCMAES(dictionary) {
  console.log('\n🚀 启动 CMA-ES 权重优化...');
  
  const terms = dictionary.dictionary;
  const dim = terms.length;
  
  console.log(`   优化维度：${dim}`);
  console.log(`   种群大小：30`);
  console.log(`   进化代数：30`);
  
  // 简化的进化策略
  const popSize = 30;
  const generations = 30;
  const mutationRate = 0.2;
  
  // 初始化种群（基于当前权重）
  let population = [];
  for (let i = 0; i < popSize; i++) {
    const individual = terms.map(t => ({
      ...t,
      weight: Math.max(0.5, t.weight + (Math.random() - 0.5) * 0.3)
    }));
    population.push(individual);
  }
  
  let bestIndividual = population[0];
  let bestScore = 0;
  
  // 评估初始种群
  console.log('\n📊 评估初始种群...');
  for (let i = 0; i < popSize; i++) {
    // 临时保存词典
    const tempDict = { ...dictionary, dictionary: population[i] };
    const tempPath = join(DATA_DIR, 'optimized_dictionary_temp.json');
    writeFileSync(tempPath, JSON.stringify(tempDict, null, 2), 'utf-8');
    
    // 运行测试
    const result = runRecallTest();
    
    if (result.recall > bestScore) {
      bestScore = result.recall;
      bestIndividual = population[i];
      console.log(`   个体 ${i}: ${(result.recall * 100).toFixed(1)}% ⭐ 新的最佳`);
    } else {
      console.log(`   个体 ${i}: ${(result.recall * 100).toFixed(1)}%`);
    }
  }
  
  console.log(`\n📊 初始最佳：${(bestScore * 100).toFixed(1)}%`);
  
  // 进化优化
  console.log('\n🔄 开始进化优化...');
  for (let gen = 0; gen < generations; gen++) {
    // 选择前 50% 作为精英
    const eliteCount = Math.floor(popSize / 2);
    // 简化：直接使用最佳个体变异
    const newPopulation = [];
    
    // 保留精英
    newPopulation.push(bestIndividual);
    
    // 生成新个体
    while (newPopulation.length < popSize) {
      const parent = bestIndividual;
      const child = parent.map(t => ({
        ...t,
        weight: Math.max(0.3, Math.min(2.0, t.weight + (Math.random() - 0.5) * mutationRate))
      }));
      newPopulation.push(child);
    }
    
    population = newPopulation;
    
    // 评估新一代
    for (let i = 0; i < popSize; i++) {
      const tempDict = { ...dictionary, dictionary: population[i] };
      const tempPath = join(DATA_DIR, 'optimized_dictionary_temp.json');
      writeFileSync(tempPath, JSON.stringify(tempDict, null, 2), 'utf-8');
      
      const result = runRecallTest();
      
      if (result.recall > bestScore) {
        bestScore = result.recall;
        bestIndividual = population[i];
        console.log(`   第${gen}代 - 个体${i}: ${(result.recall * 100).toFixed(1)}% ⭐ 新的最佳`);
      }
    }
    
    if (gen % 5 === 0 || gen === generations - 1) {
      console.log(`   第${gen}代最佳：${(bestScore * 100).toFixed(1)}%`);
    }
    
    // 如果已经达到目标，提前结束
    if (bestScore >= 0.92) {
      console.log(`\n✅ 召回率已达到 ${(bestScore * 100).toFixed(1)}% >= 92%，提前结束优化`);
      break;
    }
  }
  
  // 清理临时文件
  try {
    const tempPath = join(DATA_DIR, 'optimized_dictionary_temp.json');
    require('fs').unlinkSync(tempPath);
  } catch (e) {}
  
  console.log(`\n📊 优化完成:`);
  console.log(`   最终召回率：${(bestScore * 100).toFixed(1)}%`);
  console.log(`   是否通过：${bestScore >= 0.92 ? '✅ 是' : '❌ 否'}`);
  
  return {
    dictionary: { ...dictionary, dictionary: bestIndividual },
    finalRecall: bestScore,
    passed: bestScore >= 0.92
  };
}

/**
 * 主流程：自动优化权重
 */
async function autoOptimize() {
  console.log('='.repeat(60));
  console.log('🐎⚡ PageIndex-CN 自动权重优化器');
  console.log('='.repeat(60));
  
  // 加载当前词典
  const dictPath = join(DATA_DIR, 'optimized_dictionary.json');
  console.log(`\n📖 加载词典：${dictPath}`);
  const currentDict = JSON.parse(readFileSync(dictPath, 'utf-8'));
  console.log(`   版本：${currentDict.version}`);
  console.log(`   术语数：${currentDict.dictionary.length}`);
  
  // Step 1: 运行初始测试
  console.log('\n' + '-'.repeat(60));
  console.log('Step 1: 初始召回率测试');
  console.log('-'.repeat(60));
  const initialResult = runRecallTest();
  
  if (initialResult.passed) {
    console.log(`\n✅ 初始召回率 ${(initialResult.recall * 100).toFixed(1)}% >= 92%，无需优化！`);
    return {
      optimized: false,
      reason: '初始召回率已达标',
      recall: initialResult.recall
    };
  }
  
  // Step 2: CMA-ES 优化
  console.log('\n' + '-'.repeat(60));
  console.log('Step 2: CMA-ES 权重优化');
  console.log('-'.repeat(60));
  const optimizedResult = await optimizeWeightsWithCMAES(currentDict);
  
  if (optimizedResult.passed) {
    // Step 3: 保存优化结果
    console.log('\n' + '-'.repeat(60));
    console.log('Step 3: 保存优化词典');
    console.log('-'.repeat(60));
    
    const newVersion = `v${Date.now()}`;
    optimizedResult.dictionary.version = newVersion;
    optimizedResult.dictionary.timestamp = new Date().toISOString();
    
    const newPath = join(DATA_DIR, `optimized_dictionary_${newVersion}.json`);
    writeFileSync(newPath, JSON.stringify(optimizedResult.dictionary, null, 2), 'utf-8');
    
    // 更新主词典
    writeFileSync(dictPath, JSON.stringify(optimizedResult.dictionary, null, 2), 'utf-8');
    
    console.log(`\n✅ 优化词典已保存:`);
    console.log(`   新版本：${newVersion}`);
    console.log(`   路径：${newPath}`);
    
    return {
      optimized: true,
      version: newVersion,
      recall: optimizedResult.finalRecall,
      passed: true
    };
  } else {
    console.log('\n⚠️  优化失败，召回率未达到 92%');
    console.log('   建议：回滚到上一版本或手动调整');
    
    return {
      optimized: false,
      reason: '优化后召回率仍不达标',
      recall: optimizedResult.finalRecall,
      passed: false
    };
  }
}

// 主程序
autoOptimize()
  .then(result => {
    console.log('\n' + '='.repeat(60));
    console.log('📊 优化总结');
    console.log('='.repeat(60));
    console.log(`   是否优化：${result.optimized ? '是' : '否'}`);
    console.log(`   最终召回率：${(result.recall * 100).toFixed(1)}%`);
    console.log(`   是否通过：${result.passed ? '✅ 是' : '❌ 否'}`);
    if (result.reason) {
      console.log(`   原因：${result.reason}`);
    }
    console.log('\n✅ 自动优化流程完成！\n');
    
    // 输出 JSON 结果供脚本使用
    console.log('📄 JSON 结果:');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('\n❌ 优化失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
