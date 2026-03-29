#!/usr/bin/env node
/**
 * OpenDataLoader PDF 适配器
 * 轻量级、零 GPU 依赖的 PDF 解析器
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * OpenDataLoader PDF 适配器类
 */
export class OpenDataLoaderAdapter {
  constructor(options = {}) {
    this.options = {
      extractImages: options.extractImages || false,
      extractTables: options.extractTables || true,
      ocrEnabled: options.ocrEnabled || false,
      verbose: options.verbose || false
    };
  }

  /**
   * 解析 PDF 文档
   * @param {string} filePath - PDF 文件路径
   * @returns {Promise<Object>} 解析结果
   */
  async parse(filePath) {
    if (!existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    return new Promise((resolve, reject) => {
      const pythonScript = `
import sys
import json
import os

# 添加 skillhub 路径
skillhub_path = os.path.expanduser('~/AppData/Roaming/npm/node_modules/openclaw/skills/opendataloader-pdf')
if os.path.exists(skillhub_path):
    sys.path.insert(0, skillhub_path)

try:
    # 尝试导入 OpenDataLoader PDF
    from opendataloader_pdf import PDFLoader
    
    loader = PDFLoader(
        file_path='${filePath}',
        extract_images=${this.options.extractImages},
        extract_tables=${this.options.extractTables},
        ocr_enabled=${this.options.ocrEnabled}
    )
    
    result = loader.load()
    
    output = {
        'success': True,
        'content': result['text'],
        'metadata': {
            'engine': 'opendataloader',
            'engine_version': '1.0.0',
            'file_path': '${filePath}',
            'file_size': os.path.getsize('${filePath}'),
            'page_count': result.get('page_count', 0),
            'images': result.get('images', []),
            'tables': result.get('tables', []),
            'ocr_used': result.get('ocr_used', false)
        }
    }
    
    print(json.dumps(output, ensure_ascii=False))
    
except ImportError:
    print(json.dumps({
        'success': False,
        'error': 'OpenDataLoader PDF 未安装，请先安装: npx skillhub install opendataloader-pdf',
        'engine': 'opendataloader'
    }))
except Exception as e:
    print(json.dumps({
        'success': False,
        'error': str(e),
        'engine': 'opendataloader',
        'error_type': type(e).__name__
    }))
      `;

      const python = spawn('python', ['-c', pythonScript]);

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0 && this.options.verbose) {
          console.log(`OpenDataLoader stderr: ${stderr}`);
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
          reject(new Error(`解析响应失败: ${error.message}\n原始输出: ${stdout}`));
        }
      });
    });
  }

  /**
   * 获取引擎信息
   * @returns {Object} 引擎元数据
   */
  getEngineInfo() {
    return {
      name: 'OpenDataLoader PDF',
      version: '1.0.0',
      type: 'cpu',
      requiresGPU: false,
      features: [
        'PDF 文本提取',
        '表格提取',
        '图片元数据提取',
        'OCR 支持（可选）',
        'Prompt Injection 过滤（AI 安全）'
      ],
      strengths: [
        '零 GPU 依赖',
        '部署简单',
        '解析速度快',
        '轻量级',
        '本地运行，隐私安全'
      ],
      limitations: [
        '公式识别精度略低于 MinerU',
        '多模态支持有限'
      ]
    };
  }
}

/**
 * 创建 OpenDataLoader 适配器实例
 */
export function createOpenDataLoaderAdapter(options = {}) {
  return new OpenDataLoaderAdapter(options);
}

// 导出默认实例
export default new OpenDataLoaderAdapter();