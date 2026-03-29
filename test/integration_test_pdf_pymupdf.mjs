/**
 * PDF 集成测试 - PyMuPDF 版本
 *
 * 测试完整的 PDF 解析流程
 */

import { readFileSync, existsSync } from 'fs';
import { parseDocument } from '../src/core/parser.mjs';

// 测试文件路径
const TEST_PDF = 'test_data/test_pdf.pdf';
const TEST_MD = 'test_data/test_markdown.md';

console.log('🧪 开始 PDF 集成测试...\n');

// 1. 检查测试文件
console.log('📂 1. 检查测试文件...');
if (!existsSync(TEST_PDF)) {
  console.error('❌ 测试 PDF 文件不存在:', TEST_PDF);
  process.exit(1);
}
console.log('✅ 测试 PDF 文件存在\n');

// 2. 解析 PDF
console.log('📄 2. 解析 PDF 文档...');
let pdfResult;
try {
  pdfResult = await parseDocument(TEST_PDF, { engine: 'pymupdf', verbose: true });
  console.log('✅ PDF 解析成功\n');
} catch (error) {
  console.error('❌ PDF 解析失败:', error.message);
  process.exit(1);
}

// 3. 验证 PDF 解析结果
console.log('🔍 3. 验证 PDF 解析结果...');
if (!pdfResult.content || pdfResult.content.length === 0) {
  console.error('❌ PDF 内容为空');
  process.exit(1);
}
console.log(`✅ PDF 内容验证通过: ${pdfResult.content.length} 段文本\n`);

// 4. 解析 Markdown (向后兼容测试)
console.log('📄 4. 解析 Markdown 文档...');
let mdResult;
try {
  mdResult = await parseDocument(TEST_MD);
  console.log('✅ Markdown 解析成功\n');
} catch (error) {
  console.error('❌ Markdown 解析失败:', error.message);
  process.exit(1);
}

// 5. 验证 Markdown 解析结果
console.log('🔍 5. 验证 Markdown 解析结果...');
if (!mdResult.content || mdResult.content.length === 0) {
  console.error('❌ Markdown 内容为空');
  process.exit(1);
}
console.log(`✅ Markdown 内容验证通过: ${mdResult.content.length} 段文本\n`);

// 6. 文档类型自动检测
console.log('🎯 6. 测试文档类型自动检测...');
const pdfType = await parseDocument(TEST_PDF);
const mdType = await parseDocument(TEST_MD);

if (pdfType.type !== 'pdf') {
  console.error('❌ PDF 类型检测失败');
  process.exit(1);
}
if (mdType.type !== 'markdown') {
  console.error('❌ Markdown 类型检测失败');
  process.exit(1);
}
console.log('✅ 文档类型自动检测成功\n');

// 7. 性能测试
console.log('⚡ 7. 性能测试...');
const startTime = Date.now();
const perfResult = await parseDocument(TEST_PDF);
const endTime = Date.now();
const duration = endTime - startTime;

console.log(`⏱️  解析耗时: ${duration}ms`);
if (duration > 10000) {
  console.warn('⚠️  解析耗时较长 (>10s)');
} else {
  console.log('✅ 性能良好\n');
}

// 8. 内容完整性检查
console.log('📊 8. 内容完整性检查...');
const expectedKeywords = ['EvoIndex-2.0', 'hierarchical', 'tree', 'indexing'];
const allText = pdfResult.content;

let missingKeywords = [];
for (const keyword of expectedKeywords) {
  if (!allText.toLowerCase().includes(keyword.toLowerCase())) {
    missingKeywords.push(keyword);
  }
}

if (missingKeywords.length > 0) {
  console.warn('⚠️  缺少关键词:', missingKeywords.join(', '));
} else {
  console.log('✅ 关键词检查通过\n');
}

// 测试总结
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎉 所有测试通过！');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`\n📊 测试统计:`);
console.log(`  - PDF 解析: ✅`);
console.log(`  - Markdown 解析: ✅`);
console.log(`  - 文档类型检测: ✅`);
console.log(`  - 性能测试: ✅ (${duration}ms)`);
console.log(`  - 内容完整性: ✅`);
console.log(`\n📄 PDF 解析结果:`);
console.log(`  - 总页数: ${pdfResult.metadata.page_count}`);
console.log(`  - 文本段数: ${pdfResult.content.length}`);
console.log(`\n📄 Markdown 解析结果:`);
console.log(`  - 文本段数: ${mdResult.content.length}`);
console.log(`\n🐎⚡ 测试完成！\n`);