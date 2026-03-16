/**
 * 社区摘要生成器
 * 为每个社区生成层次化摘要
 */

import { LLMClient, defaultLLMClient } from '../utils/llm_client.mjs';
import { getCommunityEntities, getCommunityRelationships } from '../utils/graph_utils.mjs';
import Graph from 'graphology';

/**
 * 社区摘要 Prompt
 */
const SUMMARIZE_COMMUNITY_PROMPT = `
为以下实体社区生成摘要：

实体：
{entities}

关系：
{relationships}

摘要要求：
1. 概括社区的核心主题
2. 说明主要实体及其关系
3. 长度控制在 200 字以内
4. 使用简洁准确的语言
`;

/**
 * 层次化摘要 Prompt
 */
const HIERARCHICAL_SUMMARY_PROMPT = `
基于以下子社区摘要，生成父社区摘要：

子社区摘要：
{childSummaries}

摘要要求：
1. 概括所有子社区的主题
2. 避免细节，关注整体
3. 长度控制在 300 字以内
`;

export class CommunitySummarizer {
  constructor(llmClient = null, graph = null) {
    this.llm = llmClient || defaultLLMClient;
    this.graph = graph;
  }

  setGraph(graph) {
    this.graph = graph;
  }

  /**
   * 为单个社区生成摘要
   */
  async summarizeCommunity(community, graph) {
    const entities = getCommunityEntities(graph || this.graph, community);
    const relationships = getCommunityRelationships(graph || this.graph, community);

    if (entities.length === 0) {
      return {
        id: community.id,
        summary: '该社区没有实体。',
        entities: [],
        relationships: [],
      };
    }

    // 构建 Prompt
    const entitiesText = entities
      .map(e => `- ${e.name} (${e.type}): ${e.description}`)
      .join('\n');

    const relationshipsText = relationships
      .map(r => `- ${r.source} ${r.type} ${r.target}: ${r.description}`)
      .join('\n');

    const prompt = SUMMARIZE_COMMUNITY_PROMPT
      .replace('{entities}', entitiesText)
      .replace('{relationships}', relationshipsText);

    try {
      const summary = await this.llm.chat(prompt, {
        temperature: 0.5,
        maxTokens: 300,
      });

      return {
        id: community.id,
        summary: summary.trim(),
        entities,
        relationships,
      };
    } catch (error) {
      console.error(`社区 ${community.id} 摘要生成失败: ${error.message}`);
      return {
        id: community.id,
        summary: `社区包含 ${entities.length} 个实体和 ${relationships.length} 个关系。`,
        entities,
        relationships,
      };
    }
  }

  /**
   * 批量生成摘要
   */
  async summarizeCommunities(communities, graph, options = {}) {
    const summaries = [];

    for (const community of communities) {
      const summary = await this.summarizeCommunity(community, graph);
      summaries.push(summary);

      // 避免请求过快
      if (options.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }
    }

    return summaries;
  }

  /**
   * 生成层次化摘要
   */
  async summarizeHierarchical(communities, graph, options = {}) {
    async function processLevel(hierarchical, level = 0) {
      const summaries = [];

      for (const community of hierarchical) {
        if (community.children && community.children.length > 0) {
          // 先处理子社区
          const childSummaries = await processLevel(community.children, level + 1);

          // 基于子社区摘要生成父社区摘要
          const parentSummary = await this.summarizeParentCommunity(
            community,
            childSummaries
          );

          summaries.push({
            ...parentSummary,
            level,
            children: childSummaries,
          });
        } else {
          // 叶节点，直接生成摘要
          const leafSummary = await this.summarizeCommunity(community, graph);
          summaries.push({
            ...leafSummary,
            level,
            children: [],
          });
        }
      }

      return summaries;
    }

    return processLevel.call(this, communities);
  }

  /**
   * 基于子社区摘要生成父社区摘要
   */
  async summarizeParentCommunity(parentCommunity, childSummaries) {
    const childSummariesText = childSummaries
      .map(s => `- ${s.summary}`)
      .join('\n');

    const prompt = HIERARCHICAL_SUMMARY_PROMPT.replace(
      '{childSummaries}',
      childSummariesText
    );

    try {
      const summary = await this.llm.chat(prompt, {
        temperature: 0.5,
        maxTokens: 400,
      });

      return {
        id: parentCommunity.id,
        summary: summary.trim(),
        entities: parentCommunity.nodes.map(name => ({
          name,
          type: 'unknown',
          description: '',
        })),
        relationships: [],
      };
    } catch (error) {
      console.error(
        `父社区 ${parentCommunity.id} 摘要生成失败: ${error.message}`
      );
      return {
        id: parentCommunity.id,
        summary: `该社区包含 ${childSummaries.length} 个子社区。`,
        entities: [],
        relationships: [],
      };
    }
  }
}

/**
 * 默认实例
 */
export const defaultCommunitySummarizer = new CommunitySummarizer();