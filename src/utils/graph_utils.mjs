/**
 * 图工具
 * 辅助构建和操作图结构
 */

import Graph from 'graphology';

/**
 * 创建实体关系图
 */
export function createEntityRelationGraph(entities, relationships) {
  const graph = new Graph();

  // 添加实体节点
  for (const entity of entities) {
    if (!graph.hasNode(entity.name)) {
      graph.addNode(entity.name, {
        type: entity.type,
        description: entity.description,
      });
    }
  }

  // 添加关系边
  for (const rel of relationships) {
    const source = rel.source;
    const target = rel.target;

    if (!graph.hasNode(source) || !graph.hasNode(target)) {
      continue;
    }

    // 边已存在则增加权重
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

  return graph;
}

/**
 * 简单的社区检测（基于连通分量）
 * 注意：这是一个简化版本，生产环境应使用 Leiden 算法
 */
export function detectCommunities(graph) {
  const visited = new Set();
  const communities = [];

  // 对每个未访问的节点进行 BFS
  for (const node of graph.nodes()) {
    if (visited.has(node)) {
      continue;
    }

    const community = [];
    const queue = [node];
    visited.add(node);

    while (queue.length > 0) {
      const current = queue.shift();
      community.push(current);

      // 遍历邻居
      for (const neighbor of graph.neighbors(current)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    if (community.length > 0) {
      communities.push({
        id: `community-${communities.length}`,
        nodes: community,
      });
    }
  }

  return communities;
}

/**
 * 层次化社区检测（简化版）
 * 递归检测子社区
 */
export function detectHierarchicalCommunities(graph, options = {}) {
  const { minCommunitySize = 3, maxLevels = 3 } = options;

  function detectLevel(graph, level = 0) {
    if (level >= maxLevels || graph.order < minCommunitySize) {
      return [];
    }

    const communities = detectCommunities(graph);

    const hierarchical = [];

    for (const community of communities) {
      if (community.nodes.length < minCommunitySize) {
        hierarchical.push({
          id: community.id,
          level,
          nodes: community.nodes,
          children: [],
        });
        continue;
      }

      // 创建子图
      const subgraph = new Graph();
      for (const node of community.nodes) {
        subgraph.addNode(node, graph.getNodeAttributes(node));
      }

      for (const node of community.nodes) {
        for (const neighbor of graph.neighbors(node)) {
          if (!community.nodes.includes(neighbor)) {
            continue;
          }

          // 检查边是否存在
          if (graph.hasEdge(node, neighbor)) {
            subgraph.addEdge(node, neighbor, graph.getEdgeAttributes(node, neighbor));
          }
        }
      }

      // 递归检测子社区
      const children = detectLevel(subgraph, level + 1);

      hierarchical.push({
        id: community.id,
        level,
        nodes: community.nodes,
        children,
      });
    }

    return hierarchical;
  }

  return detectLevel(graph);
}

/**
 * 计算节点的中心性（度中心性）
 */
export function calculateNodeCentrality(graph) {
  const centrality = new Map();

  for (const node of graph.nodes()) {
    const degree = graph.degree(node);
    centrality.set(node, degree);
  }

  // 归一化
  const maxDegree = Math.max(...centrality.values(), 1);
  for (const [node, degree] of centrality.entries()) {
    centrality.set(node, degree / maxDegree);
  }

  return centrality;
}

/**
 * 获取社区的实体信息
 */
export function getCommunityEntities(graph, community) {
  const entities = [];

  for (const node of community.nodes) {
    const attrs = graph.getNodeAttributes(node);
    entities.push({
      name: node,
      type: attrs.type,
      description: attrs.description,
    });
  }

  // 按中心性排序
  const centrality = calculateNodeCentrality(graph);
  entities.sort((a, b) => {
    const scoreA = centrality.get(a.name) || 0;
    const scoreB = centrality.get(b.name) || 0;
    return scoreB - scoreA;
  });

  return entities;
}

/**
 * 获取社区的关系信息
 */
export function getCommunityRelationships(graph, community) {
  const relationships = [];

  const nodeSet = new Set(community.nodes);

  for (const node of community.nodes) {
    for (const neighbor of graph.neighbors(node)) {
      if (!nodeSet.has(neighbor)) {
        continue;
      }

      const edge = graph.getEdgeAttributes(node, neighbor);
      relationships.push({
        source: node,
        target: neighbor,
        type: edge.type,
        description: edge.description,
        weight: edge.weight || 1,
      });
    }
  }

  // 去重（无向边）
  const seen = new Set();
  const uniqueRelationships = [];

  for (const rel of relationships) {
    const key = [rel.source, rel.target].sort().join('|');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRelationships.push(rel);
    }
  }

  // 按权重排序
  uniqueRelationships.sort((a, b) => b.weight - a.weight);

  return uniqueRelationships;
}