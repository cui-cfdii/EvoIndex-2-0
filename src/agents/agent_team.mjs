/**
 * Agent Team 协调器
 * 协调多个 Agent 协同工作
 */

import { QueryRewriteAgent, SimpleQueryOptimizer } from './query_rewrite_agent.mjs';
import { HybridQueryEngine } from '../core/hybrid_query.mjs';

export class AgentTeamCoordinator {
  constructor(config = {}) {
    // 初始化 Agent
    this.queryAgent = new QueryRewriteAgent({
      baseURL: config.baseURL || 'http://127.0.0.1:5000',
      model: config.model || 'qwen3.5-35b-a3b',
    });

    // 备用简单优化器（LLM 不可用时）
    this.simpleOptimizer = new SimpleQueryOptimizer();

    // 检索引擎
    this.queryEngine = null;

    // Agent 角色定义
    this.roles = {
      QUERY_OPTIMIZER: '查询优化专家',
      RETRIEVAL_SPECIALIST: '检索专家',
      RANKING_EXPERT: '排序专家',
      QUALITY_AUDITOR: '质量审核员',
    };

    console.log('✅ Agent Team 初始化完成');
    console.log(`   查询优化 Agent: ${config.baseURL || 'http://127.0.0.1:5000'}`);
    console.log(`   模型：${config.model || 'qwen3.5-35b-a3b'}`);
  }

  /**
   * 加载索引
   */
  loadIndex(indexPath) {
    this.queryEngine = new HybridQueryEngine(indexPath);
    this.queryEngine.loadIndex();
    console.log(`✅ 索引加载完成：${indexPath}`);
  }

  /**
   * 完整查询流程（Agent Team 协作）
   */
  async query(query) {
    console.log('\n' + '='.repeat(60));
    console.log('🤖 Agent Team 开始协作');
    console.log('='.repeat(60));

    // Step 1: 查询优化 Agent
    console.log('\n📝 Step 1: 查询优化专家工作');
    const optimizedQuery = await this.queryAgent.optimizeQuery(query);

    if (optimizedQuery.success) {
      console.log(`✅ 查询优化成功`);
      console.log(`   意图：${optimizedQuery.optimized.intent}`);
      console.log(`   扩展查询：${optimizedQuery.optimized.expanded_queries.length} 个`);
      console.log(`   实体：${optimizedQuery.optimized.entities.length} 个`);
      console.log(`   关键词：${optimizedQuery.optimized.keywords.length} 个`);
    } else {
      console.log(`⚠️  查询优化失败，使用备用方案`);
      console.log(`   错误：${optimizedQuery.error}`);
    }

    // Step 2: 检索专家（多路召回）
    console.log('\n🔍 Step 2: 检索专家工作');
    const allResults = [];

    // 原始查询检索
    if (this.queryEngine) {
      const originalResults = this.queryEngine.search(query, { topK: 10 });
      allResults.push(...originalResults);
      console.log(`✅ 原始查询检索：${originalResults.length} 个结果`);
    }

    // 扩展查询检索
    if (optimizedQuery.success && optimizedQuery.optimized.expanded_queries) {
      for (const expandedQuery of optimizedQuery.optimized.expanded_queries.slice(0, 3)) {
        if (this.queryEngine) {
          const expandedResults = this.queryEngine.search(expandedQuery, {
            topK: 5,
          });
          allResults.push(...expandedResults);
          console.log(`✅ 扩展查询 "${expandedQuery}": ${expandedResults.length} 个结果`);
        }
      }
    }

    // Step 3: 排序专家（去重 + 加权排序）
    console.log('\n📊 Step 3: 排序专家工作');
    const rankedResults = this.rankResults(allResults, optimizedQuery);
    console.log(`✅ 排序完成：${rankedResults.length} 个结果（去重后）`);

    // Step 4: 质量审核员（过滤低质量结果）
    console.log('\n🔎 Step 4: 质量审核员工作');
    const finalResults = this.filterByQuality(rankedResults, {
      minScore: 0.3,
      topK: 10,
    });
    console.log(`✅ 质量过滤：${finalResults.length} 个结果`);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Agent Team 协作完成');
    console.log('='.repeat(60));

    return {
      query,
      optimizedQuery,
      totalResults: allResults.length,
      finalResults,
      topResults: finalResults.slice(0, 5),
    };
  }

  /**
   * 排序结果（去重 + 加权）
   */
  rankResults(results, optimizedQuery) {
    // 去重（基于节点 ID）
    const uniqueMap = new Map();

    for (const result of results) {
      const nodeId = result.node?.id || JSON.stringify(result.node);

      if (!uniqueMap.has(nodeId)) {
        uniqueMap.set(nodeId, result);
      } else {
        // 保留高分
        const existing = uniqueMap.get(nodeId);
        if (result.score > existing.score) {
          uniqueMap.set(nodeId, result);
        }
      }
    }

    // 转换为数组并排序
    const uniqueResults = Array.from(uniqueMap.values());
    uniqueResults.sort((a, b) => b.score - a.score);

    return uniqueResults;
  }

  /**
   * 质量过滤
   */
  filterByQuality(results, options) {
    return results
      .filter(r => r.score >= options.minScore)
      .slice(0, options.topK);
  }

  /**
   * 批量查询
   */
  async queryBatch(queries) {
    const results = [];

    for (const query of queries) {
      const result = await this.query(query);
      results.push(result);
    }

    return results;
  }
}
