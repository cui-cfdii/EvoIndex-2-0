/**
 * 评分算法
 * 混合评分：标题匹配 + 实体关系 + 社区相关
 */

/**
 * 标题匹配评分
 */
export function titleMatchScore(title, query) {
  if (!title || !query) {
    return 0;
  }

  const titleLower = title.toLowerCase();
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/);

  let score = 0;
  let matchedCount = 0;

  for (const keyword of keywords) {
    if (titleLower.includes(keyword)) {
      matchedCount++;
      // 完全匹配权重更高
      if (titleLower === keyword) {
        score += 1.0;
      } else {
        score += 0.5;
      }
    }
  }

  // 归一化
  if (keywords.length > 0) {
    score = score / keywords.length;
  }

  // 考虑匹配的关键词数量
  const matchRatio = matchedCount / keywords.length;
  score = score * (0.5 + 0.5 * matchRatio);

  return Math.min(score, 1.0);
}

/**
 * 实体匹配评分
 */
export function entityMatchScore(nodeEntities, query) {
  if (!nodeEntities || nodeEntities.length === 0) {
    return 0;
  }

  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/);

  let totalScore = 0;

  for (const entity of nodeEntities) {
    const entityLower = entity.name.toLowerCase();

    for (const keyword of keywords) {
      // 完全匹配
      if (entityLower === keyword) {
        totalScore += 1.0;
      }
      // 包含匹配
      else if (entityLower.includes(keyword) || keyword.includes(entityLower)) {
        totalScore += 0.5;
      }
      // 描述中匹配
      else if (
        entity.description &&
        entity.description.toLowerCase().includes(keyword)
      ) {
        totalScore += 0.3;
      }
    }
  }

  // 归一化
  const maxScore = nodeEntities.length * keywords.length;
  if (maxScore > 0) {
    totalScore = totalScore / maxScore;
  }

  return Math.min(totalScore, 1.0);
}

/**
 * 社区相关性评分
 */
export function communityRelevanceScore(
  communityId,
  query,
  communitySummaries
) {
  if (!communitySummaries || communitySummaries.length === 0) {
    return 0;
  }

  // 找到对应的社区摘要
  const community = communitySummaries.find(c => c.id === communityId);
  if (!community) {
    return 0;
  }

  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/);

  let score = 0;

  // 摘要匹配
  if (community.summary) {
    const summaryLower = community.summary.toLowerCase();

    for (const keyword of keywords) {
      if (summaryLower.includes(keyword)) {
        score += 0.5;
      }
    }

    // 归一化
    if (keywords.length > 0) {
      score = score / keywords.length;
    }
  }

  return Math.min(score, 1.0);
}

/**
 * 混合评分
 * 权重：标题 40% + 实体 30% + 社区 30%
 */
export function hybridScore(node, query, context, options = {}) {
  const weights = {
    title: options.titleWeight || 0.4,
    entity: options.entityWeight || 0.3,
    community: options.communityWeight || 0.3,
    ...options.weights,
  };

  const titleScore = titleMatchScore(node.title, query);
  const entityScore = entityMatchScore(node.entities || [], query);
  const communityScore = communityRelevanceScore(
    node.communityId,
    query,
    context.communitySummaries || []
  );

  return (
    weights.title * titleScore +
    weights.entity * entityScore +
    weights.community * communityScore
  );
}

/**
 * 内容匹配评分（补充）
 */
export function contentMatchScore(content, query) {
  if (!content || !query) {
    return 0;
  }

  const contentLower = content.toLowerCase();
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/);

  let score = 0;
  let matchedCount = 0;

  for (const keyword of keywords) {
    // 计算关键词在内容中的出现次数
    const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;

    if (matches > 0) {
      matchedCount++;
      // 限制单个关键词的最大贡献
      score += Math.min(matches * 0.2, 0.8);
    }
  }

  // 归一化
  if (keywords.length > 0) {
    score = score / keywords.length;
  }

  // 考虑匹配的关键词数量
  const matchRatio = matchedCount / keywords.length;
  score = score * (0.5 + 0.5 * matchRatio);

  return Math.min(score, 1.0);
}