/**
 * 实体关系提取器
 * 基于本地 LLM 提取实体和关系
 */

import { LLMClient, defaultLLMClient } from '../utils/llm_client.mjs';

/**
 * 实体提取 Prompt
 */
const EXTRACT_ENTITIES_PROMPT = `
从以下文本中提取实体和关系：

文本：
{text}

输出格式（JSON）：
{
  "entities": [
    {"name": "实体名", "type": "类型", "description": "描述"}
  ],
  "relationships": [
    {"source": "实体1", "target": "实体2", "type": "关系类型", "description": "描述"}
  ]
}

要求：
- 实体类型：人名、地名、组织、技术、概念、产品
- 关系类型：属于、包含、引用、相关、使用、开发、实现
- 只提取明确的实体，避免过度提取
- 确保关系中的实体在 entities 列表中存在
`;

export class EntityExtractor {
  constructor(llmClient = null) {
    this.llm = llmClient || defaultLLMClient;
  }

  /**
   * 从文本中提取实体和关系
   */
  async extract(text, options = {}) {
    const prompt = EXTRACT_ENTITIES_PROMPT.replace('{text}', text);

    try {
      const result = await this.llm.chatJSON(prompt, {
        temperature: options.temperature || 0.3,
        maxTokens: options.maxTokens || 3000,
      });

      // 验证结果格式
      if (!result.entities || !Array.isArray(result.entities)) {
        throw new Error('Invalid entities format');
      }

      if (!result.relationships || !Array.isArray(result.relationships)) {
        throw new Error('Invalid relationships format');
      }

      // 去重和清理
      const entities = this.deduplicateEntities(result.entities);
      const relationships = this.deduplicateRelationships(result.relationships, entities);

      return {
        entities,
        relationships,
      };
    } catch (error) {
      console.error(`实体提取失败: ${error.message}`);
      return { entities: [], relationships: [] };
    }
  }

  /**
   * 实体去重
   */
  deduplicateEntities(entities) {
    const entityMap = new Map();

    for (const entity of entities) {
      const key = entity.name.toLowerCase().trim();
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          name: entity.name.trim(),
          type: entity.type || 'unknown',
          description: entity.description || '',
        });
      }
    }

    return Array.from(entityMap.values());
  }

  /**
   * 关系去重和验证
   */
  deduplicateRelationships(relationships, entities) {
    const entitySet = new Set(entities.map(e => e.name.toLowerCase().trim()));
    const relationshipMap = new Map();

    for (const rel of relationships) {
      const source = rel.source.toLowerCase().trim();
      const target = rel.target.toLowerCase().trim();

      // 验证实体是否存在
      if (!entitySet.has(source) || !entitySet.has(target)) {
        continue;
      }

      const key = `${source}|${target}|${rel.type}`;
      if (!relationshipMap.has(key)) {
        relationshipMap.set(key, {
          source: rel.source.trim(),
          target: rel.target.trim(),
          type: rel.type || 'related',
          description: rel.description || '',
        });
      }
    }

    return Array.from(relationshipMap.values());
  }

  /**
   * 批量提取
   */
  async extractBatch(texts, options = {}) {
    const results = [];

    for (const text of texts) {
      const result = await this.extract(text, options);
      results.push(result);

      // 避免请求过快
      if (options.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }
    }

    // 合并所有实体和关系
    return this.mergeResults(results);
  }

  /**
   * 合并多个提取结果
   */
  mergeResults(results) {
    const allEntities = [];
    const allRelationships = [];

    for (const result of results) {
      allEntities.push(...result.entities);
      allRelationships.push(...result.relationships);
    }

    return {
      entities: this.deduplicateEntities(allEntities),
      relationships: this.deduplicateRelationships(allRelationships, allEntities),
    };
  }
}

/**
 * 默认实例
 */
export const defaultEntityExtractor = new EntityExtractor();