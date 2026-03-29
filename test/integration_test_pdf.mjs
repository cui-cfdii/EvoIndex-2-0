#!/usr/bin/env node
/**
 * PDF 集成测试
 * 测试 PDF 解析功能的完整流程
 */

import fs from 'fs';
import path from 'path';
import { parseDocument } from '../src/core/parser.mjs';
import { buildIndex } from '../src/core/tree.mjs';

/**
 * 创建测试 Markdown 文档
 */
function createTestMarkdown() {
  const content = `# 测试文档

这是测试文档的介绍部分。

## 第一章

这是第一章的内容。

### 第一节

这是第一节的内容。

## 第二章

这是第二章的内容。

### 第一节

这是第二章第一节的内容。

### 第二节

这是第二章第二节的内容。

## 结论

这是文档的结论部分。
`;

  const testFile = path.join(process.cwd(), 'test', 'data', 'test_markdown.md');
  fs.writeFileSync(testFile, content, 'utf-8');
  return testFile;
}

/**
 * 测试 Markdown 解析（向后兼容性）
 */
async function testMarkdownParsing() {
  console.log('\n📝 测试 1: Markdown 解析（向后兼容性）');

  const testFile = createTestMarkdown();

  try {
    const doc = await parseDocument(testFile, { verbose: false });

    console.log(`✅ Markdown 解析成功`);
    console.log(`   - 类型: ${doc.type}`);
    console.log(`   - 引擎: ${doc.metadata.engine}`);
    console.log(`   - 章节数: ${doc.sections.length}`);
    console.log(`   - 内容长度: ${doc.content.length} 字符`);

    // 验证章节
    if (doc.sections.length !== 7) {
      throw new Error(`章节数不匹配: 期望 7, 实际 ${doc.sections.length}`);
    }

    console.log('   ✅ 向后兼容性测试通过');
    return true;
  } catch (error) {
    console.error(`❌ Markdown 解析失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试 PDF 解析（需要真实 PDF 文件）
 */
async function testPDFParsing() {
  console.log('\n📄 测试 2: PDF 解析');

  const testPDF = path.join(process.cwd(), 'test', 'data', 'test.pdf');

  if (!fs.existsSync(testPDF)) {
    console.log('⏭️  跳过（未找到测试 PDF 文件）');
    console.log('   提示: 将 PDF 文件放到 test/data/test.pdf 以运行此测试');
    return null; // 不是失败，只是跳过
  }

  try {
    const doc = await parseDocument(testPDF, {
      engine: 'opendataloader',
      verbose: false
    });

    console.log(`✅ PDF 解析成功`);
    console.log(`   - 类型: ${doc.type}`);
    console.log(`   - 引擎: ${doc.metadata.engine}`);
    console.log(`   - 页数: ${doc.metadata.page_count}`);
    console.log(`   - 内容长度: ${doc.content.length} 字符`);

    return true;
  } catch (error) {
    console.error(`❌ PDF 解析失败: ${error.message}`);
    console.log('   提示: 确保 OpenDataLoader PDF 已安装: npx skillhub install opendataloader-pdf');
    return false;
  }
}

/**
 * 测试树索引构建
 */
async function testTreeIndexBuilding() {
  console.log('\n🌳 测试 3: 树索引构建');

  const testFile = createTestMarkdown();
  const outputFile = path.join(process.cwd(), 'test', 'data', 'test_index.json');

  try {
    const index = await buildIndex(testFile, outputFile, { verbose: false });

    console.log(`✅ 树索引构建成功`);
    console.log(`   - 标题: ${index.tree.title}`);
    console.log(`   - 节点数: ${countNodes(index.tree.root)}`);
    console.log(`   - 索引版本: ${index.metadata.index_version}`);

    // 验证索引文件存在
    if (!fs.existsSync(outputFile)) {
      throw new Error('索引文件未创建');
    }

    console.log('   ✅ 索引文件已创建');
    return true;
  } catch (error) {
    console.error(`❌ 树索引构建失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试文档类型自动检测
 */
async function testDocumentTypeDetection() {
  console.log('\n🔍 测试 4: 文档类型自动检测');

  const { detectDocumentType } = await import('../src/core/parser.mjs');

  try {
    const mdType = detectDocumentType('test.md');
    const pdfType = detectDocumentType('test.pdf');
    const txtType = detectDocumentType('test.txt');

    console.log(`✅ 文档类型检测成功`);
    console.log(`   - test.md → ${mdType}`);
    console.log(`   - test.pdf → ${pdfType}`);
    console.log(`   - test.txt → ${txtType}`);

    if (mdType !== 'markdown' || pdfType !== 'pdf' || txtType !== 'markdown') {
      throw new Error('文档类型检测失败');
    }

    console.log('   ✅ 类型检测准确');
    return true;
  } catch (error) {
    console.error(`❌ 文档类型检测失败: ${error.message}`);
    return false;
  }
}

/**
 * 统计节点数
 */
function countNodes(node) {
  let count = 1;
  for (const child of node.children) {
    count += countNodes(child);
  }
  return count;
}

/**
 * 性能测试
 */
async function testPerformance() {
  console.log('\n⚡ 测试 5: 性能测试');

  const testFile = createTestMarkdown();
  const iterations = 10;

  try {
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      await parseDocument(testFile, { verbose: false });
    }

    const endTime = Date.now();
    const avgTime = (endTime - startTime) / iterations;

    console.log(`✅ 性能测试完成`);
    console.log(`   - 迭代次数: ${iterations}`);
    console.log(`   - 总耗时: ${endTime - startTime}ms`);
    console.log(`   - 平均耗时: ${avgTime.toFixed(2)}ms`);

    if (avgTime > 100) {
      console.log('   ⚠️  性能警告: 平均耗时超过 100ms');
    } else {
      console.log('   ✅ 性能良好');
    }

    return true;
  } catch (error) {
    console.error(`❌ 性能测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 主测试流程
 */
async function runAllTests() {
  console.log('========================================');
  console.log('  EvoIndex-2.0 PDF 集成测试');
  console.log('========================================');

  // 创建测试数据目录
  const testDataDir = path.join(process.cwd(), 'test', 'data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  const results = {
    markdownParsing: null,
    pdfParsing: null,
    treeIndexBuilding: null,
    documentTypeDetection: null,
    performance: null
  };

  try {
    results.markdownParsing = await testMarkdownParsing();
    results.pdfParsing = await testPDFParsing();
    results.treeIndexBuilding = await testTreeIndexBuilding();
    results.documentTypeDetection = await testDocumentTypeDetection();
    results.performance = await testPerformance();

    // 汇总结果
    console.log('\n========================================');
    console.log('  测试结果汇总');
    console.log('========================================');

    const testNames = {
      markdownParsing: 'Markdown 解析（向后兼容性）',
      pdfParsing: 'PDF 解析',
      treeIndexBuilding: '树索引构建',
      documentTypeDetection: '文档类型检测',
      performance: '性能测试'
    };

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const [key, value] of Object.entries(results)) {
      if (value === true) {
        console.log(`✅ ${testNames[key]}: 通过`);
        passed++;
      } else if (value === false) {
        console.log(`❌ ${testNames[key]}: 失败`);
        failed++;
      } else {
        console.log(`⏭️  ${testNames[key]}: 跳过`);
        skipped++;
      }
    }

    console.log('\n----------------------------------------');
    console.log(`总计: ${passed} 通过, ${failed} 失败, ${skipped} 跳过`);
    console.log('========================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ 测试流程崩溃: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
if (process.argv[1] && process.argv[1].endsWith('integration_test_pdf.mjs')) {
  runAllTests();
}

export { runAllTests };