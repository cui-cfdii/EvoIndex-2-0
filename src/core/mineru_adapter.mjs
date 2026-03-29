#!/usr/bin/env node
/**
 * MinerU 适配器
 * 高精度多模态 PDF 解析器（GPU 加速）
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';

/**
 * MinerU 适配器类
 */
export class MinerUAdapter {
  constructor(options = {}) {
    this.options = {
      extractImages: options.extractImages !== false,
      extractTables: options.extractTables !== false,
      useGPU: options.useGPU !== false,
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

try:
    from mineru import parse_pdf
    
    # 配置解析选项
    parse_options = {
        'output_format': 'markdown',
        'extract_images': ${this.options.extractImages},
        'extract_tables': ${this.options.extractTables},
        'use_gpu': ${this.options.useGPU}
    }
    
    # 解析 PDF
    result = parse_pdf('${filePath}', **parse_options)
    
    output = {
        'success': True,
        'content': result['markdown'],
        'metadata': {
            'engine': 'mineru',
            'engine_version': '1.1.0',
            'file_path': '${filePath}',
            'file_size': os.path.getsize('${filePath}'),
            'page_count': result.get('page_count', 0),
            'images': result.get('images', []),
            'tables': result.get('tables', []),
            'formulas': result.get('formulas', []),
            'gpu_used': ${this.options.useGPU}
        }
    }
    
    print(json.dumps(output, ensure_ascii=False))
    
except ImportError:
    print(json.dumps({
        'success': False,
        'error': 'MinerU 未安装，请先安装: pip install mineru',
        'engine': 'mineru',
        'install_hint': '需要 Python 3.8+ 和 GPU 环境'
    }))
except Exception as e:
    import traceback
    print(json.dumps({
        'success': False,
        'error': str(e),
        'engine': 'mineru',
        'error_type': type(e).__name__,
        'traceback': traceback.format_exc() if ${this.options.verbose} else None
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
          console.log(`MinerU stderr: ${stderr}`);
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
      name: 'MinerU',
      version: '1.1.0',
      type: 'gpu-accelerated',
      requiresGPU: true,
      features: [
        '高精度文本提取',
        '公式识别（UniMERNet 模型）',
        '表格提取',
        '图片提取',
        '多模态支持',
        'Markdown 输出'
      ],
      strengths: [
        '公式识别精度最高',
        '多模态支持完整',
        '成熟稳定',
        '社区活跃'
      ],
      limitations: [
        '需要 GPU + CUDA 环境',
        '部署复杂（Docker 或本地 Python 环境）',
        '解析速度较慢',
        '资源占用较高'
      ]
    };
  }

  /**
   * 检查 GPU 可用性
   * @returns {Promise<Object>} GPU 信息
   */
  async checkGPUAvailability() {
    return new Promise((resolve) => {
      const python = spawn('python', ['-c', `
import json
try:
    import torch
    gpu_available = torch.cuda.is_available()
    if gpu_available:
        gpu_info = {
            'available': True,
            'device_count': torch.cuda.device_count(),
            'device_name': torch.cuda.get_device_name(0),
            'total_memory': torch.cuda.get_device_properties(0).total_memory / (1024**3)
        }
    else:
        gpu_info = {
            'available': False,
            'reason': 'CUDA not available'
        }
    print(json.dumps(gpu_info))
except ImportError:
    print(json.dumps({'available': False, 'reason': 'PyTorch not installed'}))
      `]);

      let stdout = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.on('close', () => {
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve({ available: False, reason: 'Unknown error' });
        }
      });
    });
  }
}

/**
 * 创建 MinerU 适配器实例
 */
export function createMinerUAdapter(options = {}) {
  return new MinerUAdapter(options);
}

// 导出默认实例
export default new MinerUAdapter();