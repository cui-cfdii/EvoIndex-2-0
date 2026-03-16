# LM Studio 快速启动脚本

## 安装

```powershell
# 安装 LM Studio
winget install ElementLabs.LMStudio
```

## 启动

```powershell
# 查找并启动 LM Studio
$lmStudioPath = Get-ChildItem "C:\Users\cuihao\AppData\Local\Programs" -Recurse -Filter "LM-Studio.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($lmStudioPath) {
    Write-Host "启动 LM Studio..."
    & $lmStudioPath.FullName
} else {
    Write-Host "未找到 LM Studio，请先安装："
    Write-Host "winget install ElementLabs.LMStudio"
}
```

## 启动后步骤

LM Studio 启动后，需要手动完成以下步骤：

1. **搜索模型**
   - 在搜索框输入：`qwen3.5-35b-instruct` 或 `Qwen/Qwen3.5-35B-Instruct-GGUF`
   - 点击下载

2. **启动本地服务器**
   - 点击左侧 "Local Server"
   - 选择已下载的模型
   - 点击 "Start Server"
   - 确认端口为 `1234`

3. **验证连接**
   ```bash
   curl http://localhost:1234/v1/models
   ```

4. **运行测试**
   ```bash
   cd C:\Users\cuihao\.openclaw\workspace\PageIndex-CN
   npm run test:simple
   ```

## 快速验证

运行以下脚本检查 LM Studio 是否运行：

```powershell
# 检查端口
$port = 1234
$connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue

if ($connection) {
    Write-Host "✅ LM Studio 正在运行 (端口 $port)"
    
    # 测试 API
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$port/v1/models" -Method Get
        Write-Host "✅ API 正常响应"
        Write-Host "可用模型:"
        $response.data | ForEach-Object { Write-Host "  - $($_.id)" }
    } catch {
        Write-Host "❌ API 调用失败: $_"
    }
} else {
    Write-Host "❌ LM Studio 未运行或端口 $port 未开启"
    Write-Host "请先启动 LM Studio 并开启本地服务器"
}
```

保存为 `check_lmstudio.ps1`，然后运行：
```powershell
.\check_lmstudio.ps1
```