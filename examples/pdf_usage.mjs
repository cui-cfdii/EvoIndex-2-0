#!/usr/bin/env node
/**
 * PDF 解析使用示例
 * 演示如何使用 EvoIndex-2.0 的 PDF 解析功能
 */

import { parseDocument } from '../src/core/parser.mjs';
import { createPDFParser } from '../src/core/pdf_parser.mjs';
import { buildIndex } from '../src/core/tree.mjs';
import { createOpenDataLoaderAdapter } from '../src/core/opendataloader_adapter.mjs';
import { createMinerUAdapter } from '../src/core/mineru_adapter.mjs';

// ========================================
// 示例 1: 自动检测文档类型并解析
// ========================================
async function example1_autoDetect() {
  console.log('\n========================================');
  console.log('示例 1: 自动检测文档类型并解析');
  console.log('========================================');

  const filePath = 'examples/sample_document.md';

  try {
    const doc = await parseDocument(filePath, { verbose: true });

    console.log(`\n✅ 解析成功!`);
    console.log(`   类型: ${doc.type}`);
    console.log(`   引擎: ${doc.metadata.engine}`);
    console.log(`   章节数: ${doc.sections.length}`);
  } catch (error) {
    console.error(`\n❌ 解析失败: ${error.message}`);
  }
}

// ========================================
// 示例 2: 使用 OpenDataLoader PDF 解析
// ========================================
async function example2_openDataLoader() {
  console.log('\n========================================');
  console.log('示例 2: 使用 OpenDataLoader PDF 解析');
  console.log('========================================');

  const parser = createPDFParser({
    engine: 'opendataloader',
    verbose: true
  });

  const pdfPath = 'examples/sample.pdf';

  try {
    const result = await parser.parse(pdfPath);

    console.log(`\n✅ 解析成功!`);
    console.log(`   引擎: ${result.metadata.engine}`);
    console.log(`   页数: ${result.metadata.page_count}`);
    console.log(`   内容长度: ${result.content.length} 字符`);
    console.log(`   表格数: ${result.metadata.tables.length}`);
    console.log(`   图片数: ${result.metadata.images.length}`);
  } catch (error) {
    console.error(`\n❌ 解析失败: ${error.message}`);
    console.log('   提示: 确保 OpenDataLoader PDF 已安装');
    console.log('   安装: npx skillhub install opendataloader-pdf');
  }
}

// ========================================
// 示例 3: 使用 MinerU 解析（GPU 加速）
// ========================================
async function example3_mineru() {
  console.log('\n========================================');
  console.log('示例 3: 使用 MinerU 解析（GPU 加速）');
  console.log('========================================');

  const adapter = createMinerUAdapter({
    useGPU: true,
    extractImages: true,
    extractTables: true,
    verbose: true
  });

  // 先检查 GPU 可用性
  const gpuInfo = await adapter.checkGPUAvailability();
  console.log('\n🔍 GPU 检测:');
  console.log(`   可用: ${gpuInfo.available}`);
  if (gpuInfo.available) {
    console.log(`   设备: ${gpuInfo.device_name}`);
    console.log(`   显存: ${gpuInfo.total_memory.toFixed(2)} GB`);
  } else {
    console.log(`   原因: ${gpuInfo.reason}`);
  }

  const pdfPath = 'examples/sample.pdf';

  try {
    const result = await adapter.parse(pdfPath);

    console.log(`\n✅ 解析成功!`);
    console.log(`   引擎: ${result.metadata.engine}`);
    console.log(`   页数: ${result.metadata.page_count}`);
    console.log(`   GPU 加速: ${result.metadata.gpu_used}`);
    console.log(`   公式数: ${result.metadata.formulas.length}`);
    console.log(`   表格数: ${result.metadata.tables.length}`);
  } catch (error) {
    console.error(`\n❌ 解析失败: ${error.message}`);
    console.log('   提示: 确保 MinerU 已安装');
    console.log('   安装: pip install mineru');
  }
}

// ========================================
// 示例 4: 批量解析 PDF 文档
// ========================================
async function example4_batchParsing() {
  console.log('\n========================================');
  console.log('示例 4: 批量解析 PDF 文档');
  console.log('========================================');

  const parser = createPDFParser({
    engine: 'opendataloader',
    verbose: true
  });

  const pdfFiles = [
    'examples/doc1.pdf',
    'examples/doc2.pdf',
    'examples/doc3.pdf'
  ];

  const result = await parser.parseBatch(pdfFiles);

  console.log(`\n📊 批量解析结果:`);
  console.log(`   总数: ${result.total}`);
  console.log(`   成功: ${result.success}`);
  console.log(`   失败: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log(`\n❌ 错误列表:`);
    result.errors.forEach(err => {
      console.log(`   - ${err.filePath}: ${err.error}`);
    });
  }
}

// ========================================
// 示例 5: 构建 PDF 检索树索引
// ========================================
async function example5_buildIndex() {
  console.log('\n========================================');
  console.log('示例 5: 构建 PDF 检索树索引');
  console.log('========================================');

  const pdfPath = 'examples/sample.pdf';
  const outputPath = 'examples/sample_index.json';

  try {
    const index = await buildIndex(pdfPath, outputPath, {
      engine: 'opendataloader',
      verbose: true
    });

    console.log(`\n✅ 索引构建成功!`);
    console.log(`   标题: ${index.tree.title}`);
    console.log(`   节点数: ${countNodes(index.tree.root)}`);
    console.log(`   索引版本: ${index.metadata.index_version}`);
    console.log(`   索引时间: ${index.metadata.indexed_at}`);
  } catch (error) {
    console.error(`\n❌ 索引构建失败: ${error.message}`);
  }
}

// ========================================
// 示例 6: 自动降级（MinerU → OpenDataLoader）
// ========================================
async function example6_autoFallback() {
  console.log('\n========================================');
  console.log('示例 6: 自动降级（MinerU → OpenDataLoader）');
  console.log('========================================');

  // 使用 MinerU，但如果失败会自动降级到 OpenDataLoader
  const parser = createPDFParser({
    engine: 'mineru',
    verbose: true
  });

  const pdfPath = 'examples/sample.pdf';

  try {
    const result = await parser.parse(pdfPath);

    console.log(`\n✅ 解析成功!`);
    console.log(`   引擎: ${result.metadata.engine}`);
    console.log(`   页数: ${result.metadata.page_count}`);

    if (result.metadata.engine === 'opendataloader') {
      console.log(`   ⚠️  注意: 自动降级到 OpenDataLoader（MinerU 不可用）`);
    }
  } catch (error) {
    console.error(`\n❌ 解析失败: ${error.message}`);
  }
}

// ========================================
// 示例 7: 查询引擎信息
// ========================================
async function example7_engineInfo() {
  console.log('\n========================================');
  console.log('示例 7: 查询引擎信息');
  console.log('========================================');

  const odLoader = createOpenDataLoaderAdapter();
  const mineru = createMinerUAdapter();

  console.log('\n📄 OpenDataLoader PDF:');
  const odInfo = odLoader.getEngineInfo();
  console.log(`   版本: ${odInfo.version}`);
  console.log(`   类型: ${odInfo.type}`);
  console.log(`   需要 GPU: ${odInfo.requiresGPU}`);
  console.log(`   核心特性:`);
  odInfo.features.forEach(f => console.log(`      - ${f}`));

  console.log('\n🎨 MinerU:');
  const muInfo = mineru.getEngineInfo();
  console.log(`   版本: ${muInfo.version}`);
  console.log(`   类型: ${muInfo.type}`);
  console.log(`   需要 GPU: ${muInfo.requiresGPU}`);
  console.log(`   核心特性:`);
  muInfo.features.forEach(f => console.log(`      - ${f}`));
}

// ========================================
// 辅助函数: 统计节点数
// ========================================
function countNodes(node) {
  let count = 1;
  for (const child of node.children) {
    count += countNodes(child);
  }
  return count;
}

// ========================================
// 主程序
// ========================================
async function main() {
  console.log('========================================');
  console.log('  EvoIndex-2.0 PDF 解析使用示例');
  console.log('========================================');

  // 运行所有示例
  await example1_autoDetect();
  await example2_openDataLoader();
  await example3_mineru();
  await example4_batchParsing();
  await example5_buildIndex();
  await example6_autoFallback();
  await example7_engineInfo();

  console.log('\n========================================');
  console.log('  所有示例运行完成!');
  console.log('========================================');
  console.log('\n提示: 某些示例可能需要真实的 PDF 文件才能运行');
  console.log('      将 PDF 文件放到 examples/ 目录下即可');
}

// 运行
if (process.argv[1] && process.argv[1].endsWith('pdf_usage.mjs')) {
  main().catch(error => {
    console.error(`\n❌ 错误: ${error.message}`);
    process.exit(1);
  });
}

export {
  example1_autoDetect,
  example2_openDataLoader,
  example3_mineru,
  example4_batchParsing,
  example5_buildIndex,
  example6_autoFallback,
  example7_engineInfo
};