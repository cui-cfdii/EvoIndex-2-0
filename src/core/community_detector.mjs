/**
 * 社区检测器
 * 使用简化版社区检测算法
 */

import Graph from 'graphology';
import { detectHierarchicalCommunities } from '../utils/graph_utils.mjs';

export class CommunityDetector {
  constructor(options = {}) {
    this.minCommunitySize = options.minCommunitySize || 3;
    this.maxLevels = options.maxLevels || 3;
  }

  /**
   * 检测社区
   */
  detect(graph) {
    return detectHierarchicalCommunities(graph, {
      minCommunitySize: this.minCommunitySize,
      maxLevels: this.maxLevels,
    });
  }

  /**
   * 从实体和关系构建图并检测社区
   */
  detectFromEntities(entities, relationships) {
    const graph = new Graph();

    // 添加节点
    for (const entity of entities) {
      if (!graph.hasNode(entity.name)) {
        graph.addNode(entity.name, {
          type: entity.type,
          description: entity.description,
        });
      }
    }

    // 添加边
    for (const rel of relationships) {
      const source = rel.source;
      const target = rel.target;

      if (!graph.hasNode(source) || !graph.hasNode(target)) {
        continue;
      }

      if (graph.hasEdge(source, target)) {
        const edge = graph.getEdgeAttributes(source, target);
        edge.weight = (edge.weight || 1) + 1;
        graph.setEdgeAttribute(source, target, 'weight', edge.weight);
      } else {
        graph.addEdge(source, target, {
          type: rel.type,
          description: rel.description,
          weight: 1,
        });
      }
    }

    // 检测社区
    return this.detect(graph);
  }

  /**
   * 统计社区信息
   */
  analyze(communities) {
    const stats = {
      totalCommunities: 0,
      totalNodes: 0,
      levels: {},
    };

    function countCommunities(hierarchical, level = 0) {
      if (!stats.levels[level]) {
        stats.levels[level] = {
          count: 0,
          totalNodes: 0,
        };
      }

      for (const community of hierarchical) {
        stats.totalCommunities++;
        stats.totalNodes += community.nodes.length;
        stats.levels[level].count++;
        stats.levels[level].totalNodes += community.nodes.length;

        if (community.children && community.children.length > 0) {
          countCommunities(community.children, level + 1);
        }
      }
    }

    countCommunities(communities);

    return stats;
  }
}

/**
 * 默认实例
 */
export const defaultCommunityDetector = new CommunityDetector();