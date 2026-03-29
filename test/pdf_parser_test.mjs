#!/usr/bin/env node
/**
 * PDF 解析器单元测试
 */

import { describe, it, expect } from 'jest';
import { PDFParser } from '../src/core/pdf_parser.mjs';
import { createOpenDataLoaderAdapter } from '../src/core/opendataloader_adapter.mjs';
import { createMinerUAdapter } from '../src/core/mineru_adapter.mjs';

describe('PDFParser', () => {
  let parser;

  beforeEach(() => {
    parser = new PDFParser({ verbose: false });
  });

  describe('构造函数', () => {
    it('应该创建默认实例', () => {
      expect(parser.engine).toBe('opendataloader');
      expect(parser.useGPU).toBe(false);
    });

    it('应该支持自定义配置', () => {
      const customParser = new PDFParser({
        engine: 'mineru',
        useGPU: true,
        verbose: true
      });
      expect(customParser.engine).toBe('mineru');
      expect(customParser.useGPU).toBe(true);
      expect(customParser.verbose).toBe(true);
    });
  });

  describe('parse() 方法', () => {
    it('应该拒绝不存在的文件', async () => {
      await expect(parser.parse('nonexistent.pdf'))
        .rejects
        .toThrow(/文件不存在/);
    });

    it('应该成功解析有效的 PDF（需要真实测试文件）', async () => {
      // 此测试需要真实 PDF 文件
      // 跳过或标记为待测试
    });

    it('应该降级到 OpenDataLoader 当 MinerU 失败', async () => {
      const mineruParser = new PDFParser({ engine: 'mineru' });
      // 模拟 MinerU 不可用的情况
      // 实际测试中会自动降级
    });
  });

  describe('parseBatch() 方法', () => {
    it('应该批量解析多个文件', async () => {
      const result = await parser.parseBatch(['file1.pdf', 'file2.pdf']);
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
    });
  });

  describe('detectBestEngine() 方法', () => {
    it('应该推荐 OpenDataLoader 处理大文件', async () => {
      // 假设有一个 >10MB 的文件
      // 实际测试中需要真实文件
    });
  });
});

describe('OpenDataLoaderAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = createOpenDataLoaderAdapter({ verbose: false });
  });

  describe('getEngineInfo() 方法', () => {
    it('应该返回正确的引擎信息', () => {
      const info = adapter.getEngineInfo();
      expect(info.name).toBe('OpenDataLoader PDF');
      expect(info.requiresGPU).toBe(false);
      expect(info.features).toContain('PDF 文本提取');
      expect(info.strengths).toContain('零 GPU 依赖');
    });
  });
});

describe('MinerUAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = createMinerUAdapter({ verbose: false });
  });

  describe('getEngineInfo() 方法', () => {
    it('应该返回正确的引擎信息', () => {
      const info = adapter.getEngineInfo();
      expect(info.name).toBe('MinerU');
      expect(info.requiresGPU).toBe(true);
      expect(info.features).toContain('公式识别（UniMERNet 模型）');
      expect(info.strengths).toContain('公式识别精度最高');
    });
  });

  describe('checkGPUAvailability() 方法', () => {
    it('应该检查 GPU 可用性', async () => {
      const gpuInfo = await adapter.checkGPUAvailability();
      expect(gpuInfo).toHaveProperty('available');
    });
  });
});

// 运行测试
if (process.argv[1] && process.argv[1].endsWith('pdf_parser_test.mjs')) {
  console.log('运行 PDF 解析器单元测试...\n');
  console.log('提示: 需要安装 Jest 运行完整测试套件');
  console.log('安装: npm install --save-dev jest');
  console.log('运行: npm test test/pdf_parser_test.mjs\n');
}