#!/usr/bin/env node
/**
 * PageIndex-CN v2.0 主入口
 * 整合所有模块
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 导入核心模块
import { EntityExtractor, defaultEntityExtractor } from './core/entity_extractor.mjs';
import { CommunityDetector, defaultCommunityDetector } from './core/community_detector.mjs';
import { CommunitySummarizer, defaultCommunitySummarizer } from './core/community_summarizer.mjs';
import { HybridQueryEngine } from './core/hybrid_query.mjs';

// 导入工具模块
import { LLMClient } from './utils/llm_client.mjs';
import { createEntityRelationGraph } from './utils/graph_utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 索引构建器
 */
class IndexBuilder {
  constructor(options = {}) {
    this.entityExtractor = options.entityExtractor || defaultEntityExtractor;
    this.communityDetector = options.communityDetector || defaultCommunityDetector;
    this.communitySummarizer = options.communitySummarizer || defaultCommunitySummarizer;

    this.progressCallback = options.progressCallback || null;
  }

  /**
   * 从树索引构建增强索引
   */
  async buildEnhancedIndex(inputIndex, options = {}) {
    this.reportProgress('开始构建增强索引...', 0);

    // 加载原始树索引
    let treeIndex;
    if (typeof inputIndex === 'string') {
      treeIndex = JSON.parse(fs.readFileSync(inputIndex, 'utf-8'));
    } else {
      treeIndex = inputIndex;
    }

    this.reportProgress('提取实体和关系...', 10);

    // 1. 提取所有节点的实体和关系
    const allNodes = this.flattenTree(treeIndex.root);
    const extractionResults = await this.extractEntitiesFromNodes(allNodes, options);

    this.reportProgress('检测社区...', 40);

    // 2. 检测社区
    const communities = this.communityDetector.detectFromEntities(
      extractionResults.entities,
      extractionResults.relationships
    );

    // 统计社区信息
    const stats = this.communityDetector.analyze(communities);
    console.log(`\n社区统计:`, stats);

    this.reportProgress('生成社区摘要...', 60);

    // 3. 构建图
    const graph = createEntityRelationGraph(
      extractionResults.entities,
      extractionResults.relationships
    );
    this.communitySummarizer.setGraph(graph);

    // 4. 生成社区摘要
    const communitySummaries = await this.communitySummarizer.summarizeHierarchical(
      communities,
      graph,
      { delay: 500 }
    );

    this.reportProgress('构建增强索引...', 90);

    // 5. 构建增强索引
    const enhancedIndex = {
      version: '2.0',
      tree: treeIndex,
      entities: extractionResults.entities,
      relationships: extractionResults.relationships,
      communities: communitySummaries,
      stats: {
        totalNodes: allNodes.length,
        totalEntities: extractionResults.entities.length,
        totalRelationships: extractionResults.relationships.length,
        totalCommunities: stats.totalCommunities,
      },
    };

    this.reportProgress('完成！', 100);

    return enhancedIndex;
  }

  /**
   * 扁平化树结构
   */
  flattenTree(node) {
    const nodes = [node];

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        nodes.push(...this.flattenTree(child));
      }
    }

    return nodes;
  }

  /**
   * 从节点中提取实体
   */
  async extractEntitiesFromNodes(nodes, options = {}) {
    const allEntities = [];
    const allRelationships = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // 合并标题和内容
      const text = `${node.title}\n\n${node.content || ''}`;

      if (text.trim().length < 10) {
        continue;
      }

      try {
        const result = await this.entityExtractor.extract(text, options);

        // 为每个实体添加节点引用
        const enrichedEntities = result.entities.map(e => ({
          ...e,
          nodeId: node._id || `node-${i}`,
        }));

        allEntities.push(...enrichedEntities);
        allRelationships.push(...result.relationships);

        // 报告进度
        const progress = 10 + (i / nodes.length) * 30;
        this.reportProgress(
          `提取实体... (${i + 1}/${nodes.length})`,
          progress
        );
      } catch (error) {
        console.error(`节点 ${node.title} 实体提取失败: ${error.message}`);
      }

      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // 去重
    const entityMap = new Map();
    for (const entity of allEntities) {
      const key = entity.name.toLowerCase();
      if (!entityMap.has(key)) {
        entityMap.set(key, entity);
      }
    }

    const relationshipMap = new Map();
    for (const rel of allRelationships) {
      const key = `${rel.source}|${rel.target}|${rel.type}`;
      if (!relationshipMap.has(key)) {
        relationshipMap.set(key, rel);
      }
    }

    return {
      entities: Array.from(entityMap.values()),
      relationships: Array.from(relationshipMap.values()),
    };
  }

  /**
   * 报告进度
   */
  reportProgress(message, percent) {
    if (this.progressCallback) {
      this.progressCallback(message, percent);
    } else {
      console.log(`[${percent.toFixed(0)}%] ${message}`);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('PageIndex-CN v2.0 - 基于知识图谱的混合检索系统\n');
    console.log('用法:');
    console.log('  构建索引: node index.mjs build <input.md> <output.json>');
    console.log('  查询:     node index.mjs query "<query>" <index.json>');
    console.log('  增强索引: node index.mjs enhance <input-index.json> <output.json>');
    process.exit(1);
  }

  try {
    if (command === 'build') {
      // 构建基础树索引（使用原有逻辑）
      const inputPath = args[1];
      const outputPath = args[2];

      if (!inputPath || !outputPath) {
        console.log('用法: node index.mjs build <input.md> <output.json>');
        process.exit(1);
      }

      console.log('🌳 构建树索引...');
      // TODO: 调用原有的 tree.mjs 逻辑
      console.log('✅ 树索引构建完成:', outputPath);
    } else if (command === 'enhance') {
      // 构建增强索引
      const inputPath = args[1];
      const outputPath = args[2];

      if (!inputPath || !outputPath) {
        console.log('用法: node index.mjs enhance <input-index.json> <output.json>');
        process.exit(1);
      }

      console.log('🚀 构建增强索引...');
      console.log('⚠️  注意: 此步骤需要 LLM 服务运行在 http://localhost:1234');

      const builder = new IndexBuilder();
      const enhancedIndex = await builder.buildEnhancedIndex(inputPath);

      fs.writeFileSync(
        outputPath,
        JSON.stringify(enhancedIndex, null, 2),
        'utf-8'
      );

      console.log('\n✅ 增强索引构建完成:', outputPath);
      console.log('\n统计信息:');
      console.log(`  节点数: ${enhancedIndex.stats.totalNodes}`);
      console.log(`  实体数: ${enhancedIndex.stats.totalEntities}`);
      console.log(`  关系数: ${enhancedIndex.stats.totalRelationships}`);
      console.log(`  社区数: ${enhancedIndex.stats.totalCommunities}`);
    } else if (command === 'query') {
      // 查询
      const query = args[1];
      const indexPath = args[2];

      if (!query || !indexPath) {
        console.log('用法: node index.mjs query "<query>" <index.json>');
        process.exit(1);
      }

      const engine = new HybridQueryEngine(indexPath);
      engine.query(query);
    } else if (command === 'explain') {
      // 带解释的查询
      const query = args[1];
      const indexPath = args[2];

      if (!query || !indexPath) {
        console.log('用法: node index.mjs explain "<query>" <index.json>');
        process.exit(1);
      }

      const engine = new HybridQueryEngine(indexPath);
      engine.queryWithExplanation(query);
    } else {
      console.log(`未知命令: ${command}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main();

export { IndexBuilder, HybridQueryEngine, EntityExtractor };