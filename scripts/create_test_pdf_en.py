#!/usr/bin/env python3
"""
使用 PyMuPDF 创建测试 PDF (English version for compatibility)
"""

import sys
import fitz  # PyMuPDF

def create_test_pdf(output_path):
    """
    Create test PDF document

    Args:
        output_path: Output file path
    """
    # Create new document
    doc = fitz.open()

    # Page 1
    page1 = doc.new_page()

    # Title
    page1.insert_text((72, 72), "EvoIndex-2.0 Technical Documentation", fontsize=24, fontname="helv")
    page1.insert_text((72, 100), "", fontsize=12, fontname="helv")

    # Chapter 1
    page1.insert_text((72, 130), "Chapter 1: Project Overview", fontsize=18, fontname="helv")
    page1.insert_text((72, 155), "", fontsize=12, fontname="helv")

    text = "EvoIndex-2.0 is an intelligent knowledge base indexing system that supports hierarchical tree indexing, multimodal parsing, automatic intent recognition, and self-evolutionary learning."
    page1.insert_text((72, 180), text, fontsize=12, fontname="helv")

    text2 = "Unlike traditional RAG systems, EvoIndex-2.0 uses a tree index structure that preserves the logical hierarchy of documents and improves retrieval accuracy."
    page1.insert_text((72, 200), text2, fontsize=12, fontname="helv")

    # Page 2
    page2 = doc.new_page()

    page2.insert_text((72, 72), "Chapter 2: Core Features", fontsize=18, fontname="helv")
    page2.insert_text((72, 97), "", fontsize=12, fontname="helv")

    page2.insert_text((72, 127), "2.1 Hierarchical Tree Indexing", fontsize=14, fontname="helv")
    page2.insert_text((72, 147), "", fontsize=12, fontname="helv")

    text3 = "Hierarchical tree indexing is the core innovation of EvoIndex-2.0. It organizes documents into a tree structure, where each node represents a chapter or subchapter, preserving the logical relationship of the document."
    page2.insert_text((72, 172), text3, fontsize=12, fontname="helv")

    page2.insert_text((72, 207), "2.2 Intent Recognition", fontsize=14, fontname="helv")
    page2.insert_text((72, 227), "", fontsize=12, fontname="helv")

    text4 = "The system can identify four query intents: exact match, semantic search, aggregation query, and relationship query. This enables the system to better understand user query needs."
    page2.insert_text((72, 252), text4, fontsize=12, fontname="helv")

    # Page 3
    page3 = doc.new_page()

    page3.insert_text((72, 72), "Chapter 3: Technical Architecture", fontsize=18, fontname="helv")
    page3.insert_text((72, 97), "", fontsize=12, fontname="helv")

    text5 = "EvoIndex-2.0 adopts a modular architecture, divided into document parsing layer, tree index construction layer, intent recognition layer, and query engine layer."
    page3.insert_text((72, 127), text5, fontsize=12, fontname="helv")

    page3.insert_text((72, 157), "Chapter 4: Performance Metrics", fontsize=18, fontname="helv")
    page3.insert_text((72, 182), "", fontsize=12, fontname="helv")

    text6 = "EvoIndex-2.0 has excellent performance: build time is less than 1ms/100 chapters, query time is about 2-6 seconds (using real LLM), and accuracy reaches over 85%."
    page3.insert_text((72, 212), text6, fontsize=12, fontname="helv")

    page3.insert_text((72, 242), "Chapter 5: Summary", fontsize=18, fontname="helv")
    page3.insert_text((72, 267), "", fontsize=12, fontname="helv")

    text7 = "EvoIndex-2.0 is a next-generation intelligent knowledge base system that combines multiple advanced technologies such as hierarchical indexing, intent recognition, and self-evolutionary learning, providing a brand-new solution for knowledge management."
    page3.insert_text((72, 297), text7, fontsize=12, fontname="helv")

    # Save document
    doc.save(output_path)
    doc.close()

    print(f"Test PDF created: {output_path} (3 pages)")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python create_test_pdf_en.py <output_path>")
        sys.exit(1)

    output_path = sys.argv[1]
    create_test_pdf(output_path)