#!/usr/bin/env python3
"""
jieba 分词服务
为 Node.js 提供分词接口
"""

import jieba
import json
import sys

# AI 领域自定义词典
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
    'LM Studio', 'Ollama', 'vLLM', 'ModelScope'
]

# 添加到词典
for word in CUSTOM_DICT:
    jieba.add_word(word)

def tokenize(text):
    """分词"""
    words = list(jieba.cut(text))
    return [w.strip() for w in words if w.strip()]

def tokenize_with_positions(text):
    """分词 + 位置信息"""
    words = list(jieba.cut(text))
    result = []
    pos = 0
    for word in words:
        word = word.strip()
        if word:
            result.append({
                'word': word,
                'start': pos,
                'end': pos + len(word)
            })
            pos += len(word)
    return result

def main():
    """命令行接口"""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No input provided'}))
        return
    
    command = sys.argv[1]
    
    if command == 'tokenize' and len(sys.argv) >= 3:
        text = sys.argv[2]
        tokens = tokenize(text)
        print(json.dumps({
            'success': True,
            'text': text,
            'tokens': tokens,
            'count': len(tokens)
        }, ensure_ascii=False))
    
    elif command == 'tokenize_pos' and len(sys.argv) >= 3:
        text = sys.argv[2]
        result = tokenize_with_positions(text)
        print(json.dumps({
            'success': True,
            'text': text,
            'tokens': result,
            'count': len(result)
        }, ensure_ascii=False))
    
    elif command == 'test':
        # 测试
        test_texts = [
            '中国 AI 发展历程',
            '计算机视觉技术应用',
            '开源大模型部署方案',
            'LoRA 微调方法',
            '智慧城市应用案例'
        ]
        
        results = []
        for text in test_texts:
            tokens = tokenize(text)
            results.append({
                'text': text,
                'tokens': tokens
            })
        
        print(json.dumps({
            'success': True,
            'test_results': results
        }, ensure_ascii=False))
    
    else:
        print(json.dumps({'error': f'Unknown command: {command}'}))

if __name__ == '__main__':
    main()
