#!/usr/bin/env python3
"""
PyMuPDF (fitz) PDF Parser for EvoIndex-2.0

支持文本提取、分页、元数据提取
"""

import sys
import json
import fitz  # PyMuPDF

def parse_pdf(pdf_path):
    """
    使用 PyMuPDF 解析 PDF 文档

    Args:
        pdf_path: PDF 文件路径

    Returns:
        dict: 解析结果
    """
    try:
        # 打开 PDF
        doc = fitz.open(pdf_path)

        # 提取元数据
        metadata = {
            "page_count": doc.page_count,
            "title": doc.metadata.get("title", ""),
            "author": doc.metadata.get("author", ""),
            "subject": doc.metadata.get("subject", ""),
            "creator": doc.metadata.get("creator", ""),
            "producer": doc.metadata.get("producer", ""),
        }

        # 提取内容
        content = []

        for page_num in range(doc.page_count):
            page = doc[page_num]

            # 提取文本（使用 text 参数获得更好的格式）
            text = page.get_text("text", flags=fitz.TEXT_PRESERVE_WHITESPACE)

            if text.strip():
                content.append({
                    "page": page_num + 1,
                    "text": text.strip()
                })

        # 关闭文档
        doc.close()

        # 返回结果
        result = {
            "metadata": metadata,
            "content": content,
            "status": "success"
        }

        print(json.dumps(result, ensure_ascii=False, indent=2))

    except Exception as e:
        error_result = {
            "status": "error",
            "error": str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "status": "error",
            "error": "Usage: python pymupdf_parser.py <pdf_path>"
        }, ensure_ascii=False, indent=2))
        sys.exit(1)

    pdf_path = sys.argv[1]
    parse_pdf(pdf_path)