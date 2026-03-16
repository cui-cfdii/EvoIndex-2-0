# LM Studio 安装和启动指南

## 安装

### 方法 1: 使用 winget（推荐）

```powershell
winget install ElementLabs.LMStudio
```

安装完成后，可以从开始菜单启动 LM Studio。

### 方法 2: 下载安装包

访问官网下载：https://lmstudio.ai/

## 启动 LM Studio 并加载模型

### 1. 启动 LM Studio GUI

```powershell
# 如果已安装，从开始菜单启动
# 或查找安装路径
Get-ChildItem "C:\Users\cuihao\AppData\Local\Programs" -Recurse -Filter "LM-Studio.exe"
```

### 2. 下载模型

在 LM Studio GUI 中：
1. 点击左侧 "Search" 或 "搜索"
2. 搜索 `qwen3.5-35b-a3b` 或 `qwen-qwen3.5-35b-instruct`
3. 点击下载按钮

### 3. 启动本地服务器

在 LM Studio GUI 中：
1. 点击左侧 "Local Server" 或 "本地服务器"
2. 选择已下载的模型
3. 点击 "Start Server" 或 "启动服务器"
4. 确认端口为 `1234`

### 4. 验证服务运行

```powershell
Test-NetConnection -ComputerName localhost -Port 1234
```

或者：

```powershell
curl http://localhost:1234/v1/models
```

## 命令行启动（如果支持）

如果 LM Studio 支持命令行启动：

```powershell
# 查找 LM Studio 路径
$lmStudioPath = Get-ChildItem "C:\Users\cuihao\AppData\Local\Programs" -Recurse -Filter "LM-Studio.exe" | Select-Object -First 1

# 启动 LM Studio
& $lmStudioPath.FullName

# 启动后，需要通过 GUI 界面操作
```

## 测试连接

启动服务器后，运行测试：

```bash
cd C:\Users\cuihao\.openclaw\workspace\PageIndex-CN
npm run test:simple
```

## 注意事项

1. **内存要求**: Qwen3.5-35B 需要约 20GB RAM
2. **GPU 要求**: 推荐使用 GPU 加速
3. **端口冲突**: 如果 1234 端口被占用，需要修改配置
4. **下载时间**: 模型下载可能需要较长时间（~10-20GB）

## 替代方案

如果无法安装 LM Studio，可以使用云端 LLM 服务：

修改 `src/utils/llm_client.mjs` 中的配置：

```javascript
const llm = new LLMClient({
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', // 通义千问
  model: 'qwen-turbo',
  // 需要设置 API key
});
```