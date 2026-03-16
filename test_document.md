# 测试文档

这是一个测试文档，用于验证 PageIndex-CN 检索树构建功能。

## 第一章：简介

PageIndex-CN 是一个基于本地算力的层次化检索树构建系统。

### 1.1 核心功能

主要功能包括：

1. 检索树构建
2. 智能查询
3. 章节级检索

### 1.2 使用场景

适用于需要快速检索长文档内容的场景。

## 第二章：安装与配置

### 2.1 环境要求

- Node.js v18+
- 操作系统：Windows、macOS、Linux

### 2.2 安装步骤

```bash
git clone https://github.com/example/pageindex-cn.git
cd pageindex-cn
npm install
```

## 第三章：使用方法

### 3.1 构建索引

使用以下命令构建检索树：

```bash
node src/tree.mjs input.md output.json
```

### 3.2 查询内容

使用以下命令查询内容：

```bash
node src/query_tree.mjs "关键词" output.json
```

## 第四章：性能优化

### 4.1 索引优化

通过合理的章节划分可以提高检索效率。

### 4.2 查询优化

使用精确的关键词可以获得更好的查询结果。

## 第五章：常见问题

### 5.1 索引构建失败

检查输入文档格式是否正确。

### 5.2 查询无结果

尝试使用更通用的关键词。