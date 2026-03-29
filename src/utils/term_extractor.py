#!/usr/bin/env python3
"""
术语提取器 - 从文档中提取高质量专业术语
支持 TF-IDF、词性标注、频率统计
"""

import jieba
import jieba.analyse
import json
import sys
from pathlib import Path

# 加载自定义词典（与 PageIndex-CN 保持一致）
CUSTOM_DICT = [
    '人工智能', 'AI', '大模型', 'LLM', '深度学习',
    '机器学习', '神经网络', '自然语言处理', 'NLP',
    '计算机视觉', 'CV', '图像识别', '目标检测',
    '开源', '部署', '微调', 'fine-tuning', 'LoRA',
    '智慧城市', '智能城市', '城市大脑',
    '发展历程', '演进', '里程碑',
    '应用场景', '落地', '案例',
    '检索', '召回率', '准确率', 'RAG',
    '索引', '查询', '检索引擎',
    'Qwen', '通义千问', '百度', '阿里', '腾讯',
    'LM Studio', 'Ollama', 'vLLM', 'ModelScope',
    '肺结节', '眼底', '筛查', '检测', 'CT', 'MRI',
    '糖尿病', '视网膜', '病变'
]

for word in CUSTOM_DICT:
    jieba.add_word(word)

def extract_terms_from_text(text, top_k=50, min_freq=2, min_length=2):
    """
    从文本中提取术语
    
    Args:
        text: 输入文本
        top_k: 返回的术语数量
        min_freq: 最小词频
        min_length: 最小术语长度
    
    Returns:
        list of dict: [{'term': '术语', 'weight': 0.95, 'frequency': 5}, ...]
    """
    # 方法 1: TF-IDF 关键词提取
    keywords_tfidf = jieba.analyse.extract_tags(
        text,
        topK=top_k,
        withWeight=True,
        allowPOS=('n', 'vn', 'v', 'nz')  # 名词、动名词、动词、专有名词
    )
    
    # 方法 2: 基于词频统计
    tokens = jieba.lcut(text)
    term_freq = {}
    for token in tokens:
        if len(token) >= min_length and token.strip():
            term_freq[token] = term_freq.get(token, 0) + 1
    
    # 方法 3: TextRank 关键词提取（补充）
    keywords_textrank = jieba.analyse.textrank(
        text,
        topK=top_k,
        withWeight=True,
        allowPOS=('n', 'vn', 'nz')
    )
    
    # 融合结果：TF-IDF 为主，TextRank 补充
    term_scores = {}
    
    # 添加 TF-IDF 结果
    for term, weight in keywords_tfidf:
        if len(term) >= min_length:
            term_scores[term] = {
                'term': term,
                'weight': weight,
                'frequency': term_freq.get(term, 0),
                'method': 'tfidf'
            }
    
    # TextRank 补充（如果 TF-IDF 没覆盖）
    for term, weight in keywords_textrank:
        if len(term) >= min_length and term not in term_scores:
            term_scores[term] = {
                'term': term,
                'weight': weight * 0.8,  # TextRank 权重打 8 折
                'frequency': term_freq.get(term, 0),
                'method': 'textrank'
            }
    
    # 排序并返回 top_k
    sorted_terms = sorted(
        term_scores.values(),
        key=lambda x: x['weight'],
        reverse=True
    )
    
    return sorted_terms[:top_k]

def extract_terms_from_file(filepath, top_k=50):
    """从文件提取术语"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 提取文件名作为领域提示
    filename = Path(filepath).name
    domain = infer_domain_from_filename(filename)
    
    terms = extract_terms_from_text(content, top_k)
    
    # 添加领域信息
    for term in terms:
        term['domain'] = domain
        term['source_file'] = filename
    
    return terms

def infer_domain_from_filename(filename):
    """从文件名推断领域"""
    filename_lower = filename.lower()
    
    if any(kw in filename_lower for kw in ['医疗', '医学', '医院', '肺', '眼底']):
        return 'medical_ai'
    elif any(kw in filename_lower for kw in ['法律', '合同', '诉讼']):
        return 'legal_tech'
    elif any(kw in filename_lower for kw in ['金融', '银行', '保险', '风险']):
        return 'fintech'
    elif any(kw in filename_lower for kw in ['llm', '大模型', '微调', '部署']):
        return 'llm'
    elif any(kw in filename_lower for kw in ['ai', '人工智能', '技术']):
        return 'ai_tech'
    else:
        return 'general'

def batch_extract_from_directory(dir_path, output_path=None, top_k=50):
    """批量提取目录下所有文件的术语"""
    dir_path = Path(dir_path)
    all_terms = []
    term_aggregation = {}
    
    # 处理所有 markdown 文件
    md_files = list(dir_path.rglob('*.md'))
    print(f"📄 找到 {len(md_files)} 个 markdown 文件")
    
    for md_file in md_files:
        print(f"  处理：{md_file.name}")
        terms = extract_terms_from_file(str(md_file), top_k)
        all_terms.extend(terms)
        
        # 聚合术语（跨文档统计）
        for term_data in terms:
            term = term_data['term']
            if term not in term_aggregation:
                term_aggregation[term] = {
                    'term': term,
                    'total_weight': 0,
                    'total_frequency': 0,
                    'doc_count': 0,
                    'domains': set(),
                    'source_files': []
                }
            
            term_aggregation[term]['total_weight'] += term_data['weight']
            term_aggregation[term]['total_frequency'] += term_data['frequency']
            term_aggregation[term]['doc_count'] += 1
            term_aggregation[term]['domains'].add(term_data['domain'])
            term_aggregation[term]['source_files'].append(term_data['source_file'])
    
    # 计算平均权重
    aggregated = []
    for term, data in term_aggregation.items():
        aggregated.append({
            'term': data['term'],
            'avg_weight': data['total_weight'] / data['doc_count'],
            'total_frequency': data['total_frequency'],
            'doc_count': data['doc_count'],
            'domains': list(data['domains']),
            'source_files': data['source_files']
        })
    
    # 按平均权重排序
    aggregated.sort(key=lambda x: x['avg_weight'], reverse=True)
    
    # 保存结果
    if output_path:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        result = {
            'total_files': len(md_files),
            'total_unique_terms': len(aggregated),
            'terms': aggregated
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ 术语已保存到：{output_path}")
    
    return aggregated

def main():
    """命令行接口"""
    if len(sys.argv) < 2:
        print("用法:")
        print("  python term_extractor.py file <filepath> [top_k]")
        print("  python term_extractor.py dir <dirpath> [output.json] [top_k]")
        print("  python term_extractor.py test")
        return
    
    command = sys.argv[1]
    
    if command == 'file' and len(sys.argv) >= 3:
        filepath = sys.argv[2]
        top_k = int(sys.argv[3]) if len(sys.argv) > 3 else 50
        
        print(f"📖 读取文件：{filepath}")
        terms = extract_terms_from_file(filepath, top_k)
        
        print(f"\n📊 提取到 {len(terms)} 个术语:")
        for i, term in enumerate(terms[:20], 1):
            print(f"  {i}. {term['term']}: {term['weight']:.3f} (频率:{term['frequency']})")
        
        # 保存完整结果
        output_file = filepath.replace('.md', '_terms.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({'terms': terms}, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ 完整结果已保存到：{output_file}")
    
    elif command == 'dir' and len(sys.argv) >= 3:
        dirpath = sys.argv[2]
        output_path = sys.argv[3] if len(sys.argv) > 3 else None
        top_k = int(sys.argv[4]) if len(sys.argv) > 4 else 50
        
        print(f"📁 扫描目录：{dirpath}")
        aggregated = batch_extract_from_directory(dirpath, output_path, top_k)
        
        print(f"\n📊 聚合统计:")
        print(f"  总文件数：{len(list(Path(dirpath).rglob('*.md')))}")
        print(f"  唯一术语数：{len(aggregated)}")
        print(f"\n📖 Top 20 高频术语:")
        for i, term in enumerate(aggregated[:20], 1):
            domains = ', '.join(term['domains'])
            print(f"  {i}. {term['term']}: {term['avg_weight']:.3f} (频率:{term['total_frequency']}, 文档数:{term['doc_count']}, 领域:{domains})")
    
    elif command == 'test':
        # 测试
        test_text = """
        肺结节检测是医学影像分析的重要应用场景。
        深度学习技术在 CT 影像处理中表现出色，
        通过卷积神经网络可以自动识别肺结节。
        人工智能辅助诊断系统可以提高早期筛查准确率。
        """
        
        print("🧪 测试文本:")
        print(test_text)
        print("\n📊 提取结果:")
        
        terms = extract_terms_from_text(test_text, top_k=10)
        for i, term in enumerate(terms, 1):
            print(f"  {i}. {term['term']}: {term['weight']:.3f} (频率:{term['frequency']}, 方法:{term['method']})")
    
    else:
        print(f"❌ 未知命令：{command}")
        print("\n📖 用法:")
        print("  python term_extractor.py test               # 运行测试")
        print("  python term_extractor.py dir <path> <out> # 从目录提取术语")
        print("  python term_extractor.py extract <file> <out> # 从文件提取术语")
        sys.exit(1)

if __name__ == '__main__':
    main()
