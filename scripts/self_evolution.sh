#!/bin/bash
# PageIndex-CN 自进化流程主脚本
# 用法：./self_evolution.sh [domain] [query]

set -e

echo "============================================================"
echo "🐎⚡ PageIndex-CN 自进化流程"
echo "============================================================"

# 配置
DOMAIN=${1:-"medical_ai"}
QUERY=${2:-"肺结节检测 AI 医疗影像"}
OUTPUT_DIR="data/articles/$DOMAIN"
TERMS_OUTPUT="data/extracted_terms_${DOMAIN}.json"

echo ""
echo "📋 配置信息:"
echo "   领域：$DOMAIN"
echo "   查询：$QUERY"
echo "   输出目录：$OUTPUT_DIR"
echo ""

# Step 1: 从 Tavily 抓取文章
echo "============================================================"
echo "Step 1: 从 Tavily 抓取互联网文章"
echo "============================================================"
node scripts/fetch_articles.js --domain "$DOMAIN" --query "$QUERY" --output "$OUTPUT_DIR"

if [ $? -ne 0 ]; then
  echo "❌ Step 1 失败：文章抓取失败"
  exit 1
fi

echo "✅ Step 1 完成"
echo ""

# Step 2: 提取术语
echo "============================================================"
echo "Step 2: 提取术语（jieba + TF-IDF）"
echo "============================================================"
python src/utils/term_extractor.py dir "$OUTPUT_DIR" "$TERMS_OUTPUT" 50

if [ $? -ne 0 ]; then
  echo "❌ Step 2 失败：术语提取失败"
  exit 1
fi

echo "✅ Step 2 完成"
echo ""

# Step 3: LLM 评估术语质量
echo "============================================================"
echo "Step 3: 评估术语质量（LLM + 规则）"
echo "============================================================"
node src/agents/term_evaluator.mjs "$TERMS_OUTPUT" "data/evaluated_terms_${DOMAIN}.json"

if [ $? -ne 0 ]; then
  echo "❌ Step 3 失败：术语评估失败"
  exit 1
fi

echo "✅ Step 3 完成"
echo ""

# Step 4: 更新词典
echo "============================================================"
echo "Step 4: 更新词典"
echo "============================================================"
node src/utils/dictionary_manager.mjs add "data/evaluated_terms_${DOMAIN}.json"

if [ $? -ne 0 ]; then
  echo "❌ Step 4 失败：词典更新失败"
  exit 1
fi

echo "✅ Step 4 完成"
echo ""

# Step 5: CMA-ES 权重优化
echo "============================================================"
echo "Step 5: CMA-ES 权重优化"
echo "============================================================"
node test/auto_optimize_weights.mjs

if [ $? -ne 0 ]; then
  echo "❌ Step 5 失败：权重优化失败"
  echo "🔄 自动回滚到上一版本..."
  node src/utils/dictionary_manager.mjs rollback last
  exit 1
fi

echo "✅ Step 5 完成"
echo ""

# Step 6: 最终验证
echo "============================================================"
echo "Step 6: 最终召回率验证"
echo "============================================================"
node test/recall_test_v5_jieba.mjs

if [ $? -eq 0 ]; then
  echo "✅ Step 6 完成：召回率验证通过"
else
  echo "❌ Step 6 失败：召回率验证未通过"
  echo "🔄 自动回滚到上一版本..."
  node src/utils/dictionary_manager.mjs rollback last
  exit 1
fi

echo ""
echo "============================================================"
echo "🎉 自进化流程完成！"
echo "============================================================"
echo ""
echo "📊 总结:"
echo "   领域：$DOMAIN"
echo "   查询：$QUERY"
echo "   新增术语：见 data/evaluated_terms_${DOMAIN}.json"
echo "   新词典版本：见 data/optimized_dictionary_v*.json"
echo ""
echo "💡 下一步:"
echo "   1. 检查新词典：node src/utils/dictionary_manager.mjs current"
echo "   2. 对比版本：node src/utils/dictionary_manager.mjs compare v1 v2"
echo "   3. 运行完整测试：node test/p2_recall_validation_fixed.mjs"
echo ""
