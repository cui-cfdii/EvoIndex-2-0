#!/usr/bin/env python3
"""
批量导入药品法规 PDF 文件到 EvoIndex 2.0 知识库
"""

import os
import json
import fitz  # PyMuPDF
from pathlib import Path
from datetime import datetime

# 配置
SOURCE_DIR = r"D:\知识库-药品法规"
OUTPUT_DIR = r"C:\Users\cuihao\.openclaw\workspace\projects\EvoIndex-2.0\data\articles\pharma_regulatory"
OVERVIEW_FILE = r"C:\Users\cuihao\.openclaw\workspace\projects\EvoIndex-2.0\data\articles\pharma_regulatory\00_药品法规总览.md"

# 目录名称映射（处理编码问题）
DIR_MAPPING = {
    "1. 通用法规": "01_general_regulations",
    "2. 临床试验申请": "02_clinical_trial_application", 
    "3. 临床试验实施": "03_clinical_trial_implementation",
    "4. 药品注册申报": "04_drug_registration",
    "5. 上市后维护和再注册": "05_post_market_maintenance",
    "6. 特别专题": "06_special_topics",
    "7. 指导原则": "07_guidelines",
    "8.ICH指导原则": "08_ich_guidelines"
}

def extract_text_from_pdf(pdf_path):
    """从 PDF 提取文本"""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        
        # 清理文本
        text = text.strip()
        return text if text else None
    except Exception as e:
        print(f"  ⚠️ 提取失败 {pdf_path}: {e}")
        return None

def clean_text(text):
    """清理文本"""
    lines = text.split('\n')
    cleaned = []
    for line in lines:
        line = line.strip()
        if len(line) > 5:  # 过滤太短的行
            cleaned.append(line)
    return '\n'.join(cleaned)

def get_category_from_path(pdf_path):
    """从路径获取分类"""
    parts = Path(pdf_path).parts
    for part in parts:
        if part in DIR_MAPPING:
            return DIR_MAPPING[part]
    return "00_other"

def process_pdfs():
    """处理所有 PDF 文件"""
    print("📂 开始扫描 PDF 文件...")
    
    pdf_files = []
    for root, dirs, files in os.walk(SOURCE_DIR):
        for file in files:
            if file.endswith('.pdf'):
                pdf_files.append(os.path.join(root, file))
    
    print(f"   找到 {len(pdf_files)} 个 PDF 文件")
    
    # 创建输出目录
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 分类统计
    category_stats = {}
    success_count = 0
    failed_count = 0
    
    # 创建一个汇总文档
    all_summaries = []
    
    print("\n🔄 正在转换 PDF 文件...")
    
    for i, pdf_path in enumerate(pdf_files):
        if (i + 1) % 50 == 0:
            print(f"   进度: {i+1}/{len(pdf_files)}")
        
        # 提取文本
        text = extract_text_from_pdf(pdf_path)
        if not text:
            failed_count += 1
            continue
        
        # 清理文本
        text = clean_text(text)
        if len(text) < 100:  # 内容太少
            failed_count += 1
            continue
        
        # 获取分类
        category = get_category_from_path(pdf_path)
        if category not in category_stats:
            category_stats[category] = 0
        category_stats[category] += 1
        
        # 生成文件名
        pdf_name = Path(pdf_path).stem
        # 清理文件名
        safe_name = "".join(c for c in pdf_name if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_name = safe_name[:100]  # 限制长度
        
        # 创建 Markdown 文档
        md_content = f"""# {pdf_name}

**来源**: {pdf_path}
**导入时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**分类**: {category}

---

{text}
"""
        
        # 保存文件
        output_file = os.path.join(OUTPUT_DIR, f"{category}_{safe_name}.md")
        
        # 处理文件名过长问题
        if len(output_file) > 200:
            output_file = os.path.join(OUTPUT_DIR, f"{category}_{i:04d}.md")
        
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(md_content)
            success_count += 1
            
            # 添加到汇总
            all_summaries.append(f"- **{pdf_name}** ({category})")
            
        except Exception as e:
            print(f"  ⚠️ 保存失败: {output_file}: {e}")
            failed_count += 1
    
    # 创建总览文件
    overview_content = f"""# 药品法规知识库总览

**导入时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**总文件数**: {len(pdf_files)}
**成功转换**: {success_count}
**转换失败**: {failed_count}

## 分类统计

"""
    
    for cat, count in sorted(category_stats.items()):
        overview_content += f"- {cat}: {count} 个文件\n"
    
    overview_content += f"""
## 文件清单

{chr(10).join(all_summaries)}

---

*本知识库由 EvoIndex 2.0 自动导入生成*
"""
    
    with open(OVERVIEW_FILE, 'w', encoding='utf-8') as f:
        f.write(overview_content)
    
    print(f"\n✅ 转换完成!")
    print(f"   成功: {success_count}")
    print(f"   失败: {failed_count}")
    print(f"   总览文件: {OVERVIEW_FILE}")
    
    return success_count

if __name__ == "__main__":
    process_pdfs()