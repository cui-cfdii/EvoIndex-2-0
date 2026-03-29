/**
 * PyMuPDF (fitz) Adapter for EvoIndex-2.0
 *
 * 本地 PDF 解析器，基于 PyMuPDF (fitz)
 * 无需额外依赖，轻量级，支持文本提取
 *
 * @author 耗电马喽 🐎⚡
 * @since 2026-03-21
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PYTHON_SCRIPT = join(__dirname, '..', '..', 'scripts', 'pymupdf_parser.py');

/**
 * 使用 PyMuPDF 解析 PDF 文档
 *
 * @param {string} pdfPath - PDF 文件路径
 * @param {Object} options - 解析选项
 * @returns {Promise<Object>} 解析结果
 */
export async function parseWithPyMuPDF(pdfPath, options = {}) {
  const { verbose = false } = options;

  if (verbose) {
    console.log(`[PyMuPDF] 正在解析: ${pdfPath}`);
  }

  // 获取 PyMuPDF 版本
  let engineVersion = 'unknown';
  try {
    engineVersion = await getPyMuPDFVersion();
  } catch (error) {
    // 忽略版本获取失败
  }

  return new Promise((resolve, reject) => {
    const python = spawn('python', [PYTHON_SCRIPT, pdfPath], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
      if (verbose) {
        console.log(`[PyMuPDF] ${data}`);
      }
    });

    python.on('close', (code) => {
      if (code === 0) {
        try {
          const response = JSON.parse(stdout);

          if (response.status === 'error') {
            reject(new Error(`[PyMuPDF] 解析失败: ${response.error}`));
            return;
          }

          if (verbose) {
            console.log(`[PyMuPDF] 解析完成，提取 ${response.metadata.page_count} 页，${response.content.length} 段文本`);
          }

          resolve({
            content: response.content,
            metadata: {
              engine: 'pymupdf',
              engine_version: engineVersion,
              file_path: pdfPath,
              page_count: response.metadata.page_count,
              title: response.metadata.title,
              author: response.metadata.author,
              subject: response.metadata.subject,
              creator: response.metadata.creator,
              producer: response.metadata.producer
            },
            errors: []
          });
        } catch (error) {
          reject(new Error(`[PyMuPDF] JSON 解析失败: ${error.message}`));
        }
      } else {
        reject(new Error(`[PyMuPDF] 解析失败 (exit code ${code}): ${stderr}`));
      }
    });

    python.on('error', (error) => {
      reject(new Error(`[PyMuPDF] Python 进程失败: ${error.message}`));
    });
  });
}

/**
 * 检查 PyMuPDF 是否可用
 *
 * @returns {Promise<boolean>}
 */
export async function isPyMuPDFAvailable() {
  try {
    await runPythonCommand('import fitz; print(fitz.version[0])');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 运行 Python 命令（辅助函数）
 */
function runPythonCommand(command) {
  return new Promise((resolve, reject) => {
    const python = spawn('python', ['-c', command], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr));
      }
    });

    python.on('error', reject);
  });
}

/**
 * 获取 PyMuPDF 版本信息
 *
 * @returns {Promise<string>}
 */
export async function getPyMuPDFVersion() {
  try {
    const version = await runPythonCommand('import fitz; print(fitz.version[0])');
    return version;
  } catch (error) {
    throw new Error(`无法获取 PyMuPDF 版本: ${error.message}`);
  }
}