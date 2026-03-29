#!/usr/bin/env node
/**
 * PDF 解析器 - 统一接口
 * 支持 OpenDataLoader PDF 和 MinerU 双轨模式
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { parseWithPyMuPDF } from './pymupdf_adapter.mjs';

/**
 * PDF 解析器类
 */
export class PDFParser {
  constructor(options = {}) {
    this.engine = options.engine || 'pymupdf'; // 'pymupdf' | 'mineru' | 'opendataloader'
    this.useGPU = options.useGPU || false;
    this.verbose = options.verbose || false;
  }

  /**
   * 解析单个 PDF 文档
   * @param {string} filePath - PDF 文件路径
   * @param {Object} options - 解析选项
   * @returns {Promise<Object>} 解析结果 { content, metadata, errors }
   */
  async parse(filePath, options = {}) {
    const mergedOptions = { ...options, engine: this.engine, useGPU: this.useGPU };

    // 检查文件是否存在
    if (!existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    // 根据引擎选择解析方法
    try {
      if (this.engine === 'mineru') {
        return await this._parseWithMinerU(filePath, mergedOptions);
      } else {
        return await this._parseWithOpenDataLoader(filePath, mergedOptions);
      }
    } catch (error) {
      // 尝试降级到 OpenDataLoader
      if (this.engine === 'mineru') {
        if (this.verbose) {
          console.log(`⚠️  MinerU 解析失败，降级到 OpenDataLoader: ${error.message}`);
        }
        try {
          return await this._parseWithOpenDataLoader(filePath, { ...mergedOptions, engine: 'opendataloader' });
        } catch (fallbackError) {
          throw new Error(`PDF 解析失败（尝试了两种引擎）: ${fallbackError.message}`);
        }
      }
      throw error;
    }
  }

  /**
   * 批量解析 PDF 文档
   * @param {string[]} filePaths - PDF 文件路径数组
   * @param {Object} options - 解析选项
   * @returns {Promise<Object[]>} 解析结果数组
   */
  async parseBatch(filePaths, options = {}) {
    const results = [];
    const errors = [];

    for (const filePath of filePaths) {
      try {
        const result = await this.parse(filePath, options);
        results.push(result);
        if (this.verbose) {
          console.log(`✅ 解析成功: ${filePath}`);
        }
      } catch (error) {
        errors.push({ filePath, error: error.message });
        if (this.verbose) {
          console.log(`❌ 解析失败: ${filePath} - ${error.message}`);
        }
      }
    }

    return {
      results,
      errors,
      total: filePaths.length,
      success: results.length,
      failed: errors.length
    };
  }

  /**
   * 使用 PyMuPDF 解析（替代 OpenDataLoader）
   * @private
   */
  async _parseWithOpenDataLoader(filePath, options) {
    return await parseWithPyMuPDF(filePath, options);
  }

  /**
   * 使用 MinerU 解析
   * @private
   */
  async _parseWithMinerU(filePath, options) {
    return new Promise((resolve, reject) => {
      const python = spawn('python', [
        '-c',
        `
import sys
import json
sys.path.insert(0, '${resolve(process.cwd())}')

try:
    from mineru import parse_pdf
    
    result = parse_pdf(
        '${filePath}',
        output_format='markdown',
        extract_images=${options.extractImages || false},
        extract_tables=${options.extractTables || true}
    )
    
    print(json.dumps({
        'success': True,
        'content': result['markdown'],
        'metadata': {
            'engine': 'mineru',
            'engine_version': '1.1.0',
            'file_path': '${filePath}',
            'page_count': result.get('page_count', 0),
            'images': result.get('images', []),
            'tables': result.get('tables', [])
        }
    }))
except Exception as e:
    print(json.dumps({
        'success': False,
        'error': str(e),
        'engine': 'mineru'
    }))
        `
      ]);

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`MinerU 解析失败: ${stderr}`));
          return;
        }

        try {
          const response = JSON.parse(stdout);
          if (!response.success) {
            reject(new Error(response.error));
            return;
          }

          resolve({
            content: response.content,
            metadata: response.metadata,
            errors: []
          });
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });
  }

  /**
   * 自动检测 PDF 文档类型
   * @param {string} filePath - PDF 文件路径
   * @returns {Promise<string>} 推荐的解析引擎
   */
  async detectBestEngine(filePath) {
    // 默认使用 PyMuPDF（已安装，无需额外依赖）
    return 'pymupdf';
  }
}

/**
 * 创建 PDF 解析器实例（工厂函数）
 */
export function createPDFParser(options = {}) {
  return new PDFParser(options);
}

// 导出默认实例
export default new PDFParser();

// 测试
if (process.argv[1] && process.argv[1].endsWith('pdf_parser.mjs')) {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const parser = new PDFParser({ verbose: true });
    parser.parse(args[0])
      .then(result => {
        console.log(`\n✅ PDF 解析成功!`);
        console.log(`   - 引擎: ${result.metadata.engine}`);
        console.log(`   - 页数: ${result.metadata.page_count}`);
        console.log(`   - 内容长度: ${result.content.length} 字符`);
        console.log(`\n内容预览:`);
        console.log(result.content.substring(0, 500) + '...');
      })
      .catch(error => {
        console.error(`\n❌ 解析失败: ${error.message}`);
        process.exit(1);
      });
  } else {
    console.log('用法: node pdf_parser.mjs <pdf_file>');
  }
}