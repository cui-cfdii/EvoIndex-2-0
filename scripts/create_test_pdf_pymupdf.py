#!/usr/bin/env python3
"""
使用 PyMuPDF 创建测试 PDF
"""

import sys
import fitz  # PyMuPDF

def create_test_pdf(output_path):
    """
    创建测试 PDF

    Args:
        output_path: 输出文件路径
    """
    # 创建新文档
    doc = fitz.open()

    # 第 1 页
    page1 = doc.new_page()

    # 标题
    page1.insert_text((72, 72), "EvoIndex-2.0 技术文档", fontsize=24, fontname="helv")
    page1.insert_text((72, 100), "", fontsize=12, fontname="helv")

    # 第一章
    page1.insert_text((72, 130), "第 1 章 项目概述", fontsize=18, fontname="helv")
    page1.insert_text((72, 155), "", fontsize=12, fontname="helv")

    text = "EvoIndex-2.0 是一个智能知识库索引系统，支持层次化树索引、多模态解析、自动意图识别和自进化学习。"
    page1.insert_text((72, 180), text, fontsize=12, fontname="helv")

    text2 = "与传统 RAG 系统不同，EvoIndex-2.0 使用树索引结构，保留了文档的逻辑层次关系，提高了检索准确性。"
    page1.insert_text((72, 200), text2, fontsize=12, fontname="helv")

    # 第 2 页
    page2 = doc.new_page()

    page2.insert_text((72, 72), "第 2 章 核心特性", fontsize=18, fontname="helv")
    page2.insert_text((72, 97), "", fontsize=12, fontname="helv")

    page2.insert_text((72, 127), "2.1 层次化树索引", fontsize=14, fontname="helv")
    page2.insert_text((72, 147), "", fontsize=12, fontname="helv")

    text3 = "层次化树索引是 EvoIndex-2.0 的核心创新。它将文档组织成树结构，每个节点代表一个章节或子章节，保留了文档的逻辑关系。"
    page2.insert_text((72, 172), text3, fontsize=12, fontname="helv")

    page2.insert_text((72, 207), "2.2 意图识别", fontsize=14, fontname="helv")
    page2.insert_text((72, 227), "", fontsize=12, fontname="helv")

    text4 = "系统可以识别 4 种查询意图：精确匹配、语义搜索、聚合查询和关系查询。这使系统能够更好地理解用户的查询需求。"
    page2.insert_text((72, 252), text4, fontsize=12, fontname="helv")

    # 第 3 页
    page3 = doc.new_page()

    page3.insert_text((72, 72), "第 3 章 技术架构", fontsize=18, fontname="helv")
    page3.insert_text((72, 97), "", fontsize=12, fontname="helv")

    text5 = "EvoIndex-2.0 采用模块化架构，分为文档解析层、树索引构建层、意图识别层和查询引擎层。"
    page3.insert_text((72, 127), text5, fontsize=12, fontname="helv")

    page3.insert_text((72, 157), "第 4 章 性能指标", fontsize=18, fontname="helv")
    page3.insert_text((72, 182), "", fontsize=12, fontname="helv")

    text6 = "EvoIndex-2.0 的性能表现优异：构建耗时小于 1ms/100 章节，查询耗时约 2-6 秒（使用真实 LLM），准确率达到 85% 以上。"
    page3.insert_text((72, 212), text6, fontsize=12, fontname="helv")

    page3.insert_text((72, 242), "第 5 章 总结", fontsize=18, fontname="helv")
    page3.insert_text((72, 267), "", fontsize=12, fontname="helv")

    text7 = "EvoIndex-2.0 是下一代智能知识库系统，结合了层次化索引、意图识别、自进化学习等多项先进技术，为知识管理提供了全新的解决方案。"
    page3.insert_text((72, 297), text7, fontsize=12, fontname="helv")

    # 保存文档
    doc.save(output_path)
    doc.close()

    print(f"测试 PDF 已生成: {output_path} (3 页)")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python create_test_pdf_pymupdf.py <output_path>")
        sys.exit(1)

    output_path = sys.argv[1]
    create_test_pdf(output_path)