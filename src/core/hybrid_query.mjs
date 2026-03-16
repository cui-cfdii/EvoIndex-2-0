/**
 * 混合查询引擎
 * 支持标题匹配 + 实体关系 + 社区摘要的混合检索
 */

import fs from 'fs';
import {
  hybridScore,
  titleMatchScore,
  entityMatchScore,
  communityRelevanceScore,
} from '../utils/scoring.mjs';

export class HybridQueryEngine {
  constructor(indexPath) {
    this.indexPath = indexPath;
    this.index = null;
    this.communitySummaries = [];
  }

  /**
   * 加载索引
   */
  loadIndex() {
    if (!fs.existsSync(this.indexPath)) {
      throw new Error(`索引文件不存在: ${this.indexPath}`);
    }

    const content = fs.readFileSync(this.indexPath, 'utf-8');
    this.index = JSON.parse(content);

    // 加载社区摘要
    if (this.index.communities) {
      this.communitySummaries = this.flattenCommunities(
        this.index.communities
      );
    }

    return this;
  }

  /**
   * 扁平化层次化社区
   */
  flattenCommunities(communities, level = 0) {
    const flat = [];

    for (const community of communities) {
      flat.push({
        ...community,
        level,
      });

      if (community.children && community.children.length > 0) {
        flat.push(...this.flattenCommunities(community.children, level + 1));
      }
    }

    return flat;
  }

  /**
   * 在树中搜索节点（递归）
   */
  searchTree(node, query, results) {
    if (!node) {
      return;
    }

    // 为当前节点分配社区 ID（如果有）
    const nodeWithCommunity = {
      ...node,
      communityId: this.findCommunityForNode(node),
    };

    // 计算混合评分
    const score = hybridScore(
      nodeWithCommunity,
      query,
      { communitySummaries: this.communitySummaries }
    );

    if (score > 0) {
      results.push({
        node: nodeWithCommunity,
        score,
        details: {
          title: titleMatchScore(node.title, query),
          entity: entityMatchScore(node.entities || [], query),
          community: communityRelevanceScore(
            nodeWithCommunity.communityId,
            query,
            this.communitySummaries
          ),
        },
      });
    }

    // 递归搜索子节点
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        this.searchTree(child, query, results);
      }
    }
  }

  /**
   * 为节点找到对应的社区
   */
  findCommunityForNode(node) {
    // 简化版：基于标题关键词匹配社区
    // 生产环境应该使用更复杂的方法

    if (!this.communitySummaries || this.communitySummaries.length === 0) {
      return null;
    }

    const nodeText = `${node.title} ${node.content}`.toLowerCase();

    // 找到最相关的社区
    let bestCommunity = null;
    let bestScore = 0;

    for (const community of this.communitySummaries) {
      const score = this.calculateNodeCommunityRelevance(nodeText, community);
      if (score > bestScore) {
        bestScore = score;
        bestCommunity = community.id;
      }
    }

    return bestCommunity;
  }

  /**
   * 计算节点与社区的相关性
   */
  calculateNodeCommunityRelevance(nodeText, community) {
    let score = 0;

    // 基于社区摘要
    if (community.summary) {
      const summaryLower = community.summary.toLowerCase();
      const summaryWords = summaryLower.split(/\s+/);

      for (const word of summaryWords) {
        if (nodeText.includes(word)) {
          score += 0.1;
        }
      }
    }

    // 基于社区实体
    if (community.entities) {
      for (const entity of community.entities) {
        if (nodeText.includes(entity.name.toLowerCase())) {
          score += 0.3;
        }
      }
    }

    return score;
  }

  /**
   * 查询
   */
  query(query, options = {}) {
    if (!this.index) {
      this.loadIndex();
    }

    const topK = options.topK || 10;
    const minScore = options.minScore || 0.3;

    console.log('🔍 查询:', query);

    // 搜索所有节点
    const results = [];
    this.searchTree(this.index.root, query, results);

    console.log(`✅ 找到 ${results.length} 个匹配项\n`);

    if (results.length === 0) {
      console.log('未找到匹配内容');
      return [];
    }

    // 按分数排序
    results.sort((a, b) => b.score - a.score);

    // 过滤低分结果
    const filtered = results.filter(r => r.score >= minScore);

    // 取 Top K
    const topResults = filtered.slice(0, topK);

    // 显示结果
    this.displayResults(topResults, query);

    return topResults;
  }

  /**
   * 显示结果
   */
  displayResults(results, query) {
    console.log(`\n📊 排序结果 (Top ${results.length}):\n`);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const node = result.node;

      console.log(
        `${i + 1}. ${'#'.repeat(node.level)} ${node.title}`
      );
      console.log(`   综合评分: ${(result.score * 100).toFixed(1)}%`);

      if (options.showDetails) {
        console.log(`   评分明细:`);
        console.log(`   - 标题匹配: ${(result.details.title * 100).toFixed(1)}%`);
        console.log(`   - 实体匹配: ${(result.details.entity * 100).toFixed(1)}%`);
        console.log(
          `   - 社区相关: ${(result.details.community * 100).toFixed(1)}%`
        );
      }

      if (result.node.communityId) {
        console.log(`   所属社区: ${result.node.communityId}`);
      }

      // 显示上下文片段
      const snippet = node.content.trim().slice(0, 200);
      if (snippet) {
        console.log(`   片段: ${snippet}...`);
      }
      console.log();
    }
  }

  /**
   * 带解释的查询
   */
  queryWithExplanation(query, options = {}) {
    options.showDetails = true;
    return this.query(query, options);
  }
}

/**
 * 命令行接口
 */
export function runHybridQuery() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('用法: node hybrid_query.mjs "<query>" <index.json> [options]');
    console.log('选项:');
    console.log('  --topK <number>     返回结果数量 (默认: 10)');
    console.log('  --minScore <number> 最小评分阈值 (默认: 0.3)');
    console.log('  --showDetails       显示评分明细');
    process.exit(1);
  }

  const query = args[0];
  const indexPath = args[1];

  const options = {
    topK: 10,
    minScore: 0.3,
    showDetails: false,
  };

  // 解析选项
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--topK' && i + 1 < args.length) {
      options.topK = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--minScore' && i + 1 < args.length) {
      options.minScore = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--showDetails') {
      options.showDetails = true;
    }
  }

  const engine = new HybridQueryEngine(indexPath);
  engine.query(query, options);
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runHybridQuery();
}