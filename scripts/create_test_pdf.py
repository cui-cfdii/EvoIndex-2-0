#!/usr/bin/env python3
"""
生成测试 PDF 文档用于 EvoIndex-2.0 测试
"""

import sys
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.units import inch

def create_test_pdf(output_path):
    """
    创建测试 PDF

    Args:
        output_path: 输出文件路径
    """
    doc = SimpleDocTemplate(output_path, pagesize=A4)
    styles = getSampleStyleSheet()

    story = []

    # 标题
    title = Paragraph("EvoIndex-2.0 技术文档", styles["Title"])
    story.append(title)
    story.append(Spacer(1, 0.2 * inch))

    # 第一章
    chapter1 = Paragraph("第 1 章 项目概述", styles["Heading1"])
    story.append(chapter1)
    story.append(Spacer(1, 0.1 * inch))

    para1 = Paragraph(
        "EvoIndex-2.0 是一个智能知识库索引系统，支持层次化树索引、"
        "多模态解析、自动意图识别和自进化学习。",
        styles["Normal"]
    )
    story.append(para1)
    story.append(Spacer(1, 0.1 * inch))

    para2 = Paragraph(
        "与传统 RAG 系统不同，EvoIndex-2.0 使用树索引结构，"
        "保留了文档的逻辑层次关系，提高了检索准确性。",
        styles["Normal"]
    )
    story.append(para2)
    story.append(Spacer(1, 0.1 * inch))

    # 第二章
    chapter2 = Paragraph("第 2 章 核心特性", styles["Heading1"])
    story.append(chapter2)
    story.append(Spacer(1, 0.1 * inch))

    subchapter2_1 = Paragraph("2.1 层次化树索引", styles["Heading2"])
    story.append(subchapter2_1)
    story.append(Spacer(1, 0.1 * inch))

    para3 = Paragraph(
        "层次化树索引是 EvoIndex-2.0 的核心创新。它将文档组织成树结构，"
        "每个节点代表一个章节或子章节，保留了文档的逻辑关系。",
        styles["Normal"]
    )
    story.append(para3)
    story.append(Spacer(1, 0.1 * inch))

    subchapter2_2 = Paragraph("2.2 意图识别", styles["Heading2"])
    story.append(subchapter2_2)
    story.append(Spacer(1, 0.1 * inch))

    para4 = Paragraph(
        "系统可以识别 4 种查询意图：精确匹配、语义搜索、聚合查询和关系查询。",
        "这使系统能够更好地理解用户的查询需求。",
        styles["Normal"]
    )
    story.append(para4)
    story.append(Spacer(1, 0.1 * inch))

    # 第三章
    chapter3 = Paragraph("第 3 章 技术架构", styles["Heading1"])
    story.append(chapter3)
    story.append(Spacer(1, 0.1 * inch))

    para5 = Paragraph(
        "EvoIndex-2.0 采用模块化架构，分为文档解析层、树索引构建层、"
        "意图识别层和查询引擎层。",
        styles["Normal"]
    )
    story.append(para5)
    story.append(Spacer(1, 0.1 * inch))

    # 分页
    story.append(PageBreak())

    # 第四章
    chapter4 = Paragraph("第 4 章 性能指标", styles["Heading1"])
    story.append(chapter4)
    story.append(Spacer(1, 0.1 * inch))

    para6 = Paragraph(
        "EvoIndex-2.0 的性能表现优异：构建耗时小于 1ms/100 章节，"
        "查询耗时约 2-6 秒（使用真实 LLM），准确率达到 85% 以上。",
        styles["Normal"]
    )
    story.append(para6)
    story.append(Spacer(1, 0.1 * inch))

    # 第五章
    chapter5 = Paragraph("第 5 章 总结", styles["Heading1"])
    story.append(chapter5)
    story.append(Spacer(1, 0.1 * inch))

    para7 = Paragraph(
        "EvoIndex-2.0 是下一代智能知识库系统，结合了层次化索引、"
        "意图识别、自进化学习等多项先进技术，为知识管理提供了全新的解决方案。",
        styles["Normal"]
    )
    story.append(para7)
    story.append(Spacer(1, 0.1 * inch))

    # 生成 PDF
    doc.build(story)
    print(f"测试 PDF 已生成: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python create_test_pdf.py <output_path>")
        sys.exit(1)

    output_path = sys.argv[1]
    create_test_pdf(output_path)