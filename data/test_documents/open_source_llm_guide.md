# 开源大模型技术指南

## 第一章：概述

### 1.1 什么是开源大模型

开源大模型是指模型权重、训练代码或推理代码对公众开放的大型语言模型。

**特点**：
- 免费使用：无需支付 API 费用
- 可定制：可以根据需求微调
- 透明：模型结构和训练数据更透明
- 本地部署：数据隐私有保障

### 1.2 主流开源模型

**Qwen 系列（通义千问）**：
- Qwen-7B / 14B / 72B
- Qwen1.5 / Qwen2 / Qwen2.5
- Qwen3 / Qwen3.5
- MoE 架构：Qwen3.5-35B-A3B（激活 3B 参数）

**Llama 系列（Meta）**：
- Llama-2-7B / 13B / 70B
- Llama-3-8B / 70B
- Llama-3.1-405B

**其他优秀模型**：
- ChatGLM3-6B（智谱 AI）
- Baichuan2-7B / 13B（百川智能）
- Yi-6B / 34B（零一万物）
- Mistral-7B / Mixtral 8x7B（Mistral AI）

### 1.3 应用场景

**适合场景**：
- 企业内部知识库
- 私有化部署
- 数据敏感场景
- 成本敏感项目
- 定制化需求

**不适合场景**：
- 需要最新知识（知识截止训练数据）
- 多模态任务（纯文本模型）
- 超低延迟要求（本地推理较慢）

## 第二章：本地部署

### 2.1 硬件要求

**最低配置**：
- CPU：8 核以上
- 内存：16GB（7B 模型量化）
- 存储：50GB SSD

**推荐配置**：
- GPU：RTX 3090 / 4090（24GB 显存）
- 内存：32GB+
- 存储：1TB NVMe SSD

**高端配置**：
- 多 GPU：A100 / H100
- 内存：128GB+
- 存储：4TB+ NVMe SSD

### 2.2 部署方案

**方案 1：LM Studio（推荐新手）**
- 优点：图形界面、一键部署
- 缺点：功能相对简单
- 适用：个人使用、快速测试

**方案 2：Ollama**
- 优点：命令行工具、支持多模型
- 缺点：需要命令行操作
- 适用：开发者、自动化场景

**方案 3：vLLM**
- 优点：高性能、支持并发
- 缺点：配置复杂
- 适用：生产环境、高并发

**方案 4：Text Generation Inference (TGI)**
- 优点：HuggingFace 官方、功能强大
- 缺点：需要 Docker
- 适用：企业部署

### 2.3 模型下载

**ModelScope（阿里）**：
```bash
# 安装 modelscope
pip install modelscope

# 下载 Qwen3.5-35B-A3B
modelscope download qwen/Qwen3.5-35B-A3B
```

**HuggingFace**：
```bash
# 安装 huggingface-cli
pip install huggingface_hub

# 下载模型
huggingface-cli download Qwen/Qwen3.5-35B-A3B
```

**直接下载**：
- 访问 ModelScope 或 HuggingFace 网站
- 选择合适量化版本（FP16 / INT8 / INT4）
- 下载模型文件

### 2.4 量化技术

**量化级别**：
- FP16：原始精度，显存占用大
- INT8：8bit 量化，显存减半
- INT4：4bit 量化，显存 1/4
- INT3/INT2：极端量化，精度损失大

**推荐选择**：
- 7B 模型：INT4（约 4GB 显存）
- 14B 模型：INT4（约 8GB 显存）
- 35B 模型：INT4（约 20GB 显存）
- 72B 模型：INT4（约 40GB 显存）

## 第三章：API 集成

### 3.1 OpenAI 兼容 API

大多数本地部署工具支持 OpenAI 兼容 API。

**请求示例**：
```bash
curl http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.5-35b-a3b",
    "messages": [
      {"role": "user", "content": "你好！"}
    ],
    "temperature": 0.7,
    "max_tokens": 1000
  }'
```

**Python 示例**：
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:1234/v1",
    api_key="not-needed"
)

response = client.chat.completions.create(
    model="qwen3.5-35b-a3b",
    messages=[
        {"role": "user", "content": "你好！"}
    ]
)

print(response.choices[0].message.content)
```

### 3.2 常用参数

**temperature**：
- 范围：0.0 - 2.0
- 低值（0.1-0.3）：确定性强，适合代码生成
- 中值（0.5-0.7）：平衡，适合对话
- 高值（0.8-1.0）：创造性强，适合创意写作

**max_tokens**：
- 控制输出长度
- 根据需求设置（通常 500-2000）

**top_p**：
- 核采样参数
- 范围：0.0 - 1.0
- 推荐：0.9-0.95

**frequency_penalty**：
- 减少重复
- 范围：-2.0 - 2.0
- 推荐：0.1-0.5

### 3.3 流式输出

**流式请求**：
```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:1234/v1")

stream = client.chat.completions.create(
    model="qwen3.5-35b-a3b",
    messages=[{"role": "user", "content": "讲个故事"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

## 第四章：性能优化

### 4.1 推理加速

**技术方法**：
- KV Cache：缓存历史 token 的 KV 值
- PagedAttention：分页注意力机制
- FlashAttention：高效注意力实现
- Speculative Decoding：推测性解码

**工具推荐**：
- vLLM：高性能推理引擎
- TensorRT-LLM：NVIDIA 优化
- DeepSpeed：微软优化

### 4.2 并发处理

**并发策略**：
- 批处理（Batching）：合并多个请求
- 连续批处理（Continuous Batching）：动态批大小
- 请求调度：优先级队列

**性能指标**：
- 吞吐量（Throughput）：tokens/秒
- 延迟（Latency）：首 token 时间
- 并发数（Concurrency）：同时处理请求数

### 4.3 显存优化

**优化技术**：
- 模型并行：多 GPU 分摊显存
- 激活重计算：节省显存换时间
- 混合精度：FP16+INT8 混合
- CPU Offload：显存不足时用内存

## 第五章：微调实践

### 5.1 微调方法

**全量微调**：
- 优点：效果最好
- 缺点：显存需求大、训练慢
- 适用：充足资源、追求最佳效果

**LoRA（Low-Rank Adaptation）**：
- 优点：显存需求小、训练快
- 缺点：效果略逊于全量
- 适用：资源有限、快速迭代

**QLoRA（Quantized LoRA）**：
- 优点：显存需求极小
- 缺点：量化损失
- 适用：消费级 GPU

### 5.2 数据准备

**数据格式**：
```json
[
  {
    "messages": [
      {"role": "system", "content": "你是一个助手"},
      {"role": "user", "content": "你好"},
      {"role": "assistant", "content": "你好！有什么可以帮助你的？"}
    ]
  }
]
```

**数据质量**：
- 多样性：覆盖不同场景
- 准确性：答案正确
- 一致性：格式统一
- 数量：至少 1000 条

### 5.3 训练技巧

**学习率**：
- 全量微调：1e-5 - 5e-5
- LoRA：1e-4 - 5e-4
- QLoRA：1e-4 - 1e-3

**训练轮数**：
- 小数据集（<1000）：3-5 epochs
- 中等数据集（1000-10000）：1-3 epochs
- 大数据集（>10000）：1 epoch

**评估指标**：
- 损失值（Loss）
- 准确率（Accuracy）
- 人工评估

---

**作者**：耗电马喽 🐎⚡
**版本**：v1.0
**最后更新**：2026-03-13
