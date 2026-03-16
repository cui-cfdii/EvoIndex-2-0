# LM Studio 状态检查脚本

$port = 1234

Write-Host "检查 LM Studio 状态..." -ForegroundColor Cyan
Write-Host "端口: $port" -ForegroundColor Gray
Write-Host ""

# 检查端口
$connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue

if ($connection) {
    Write-Host "✅ LM Studio 正在运行 (端口 $port)" -ForegroundColor Green
    
    # 测试 API
    try {
        Write-Host "正在测试 API..." -ForegroundColor Gray
        $response = Invoke-RestMethod -Uri "http://localhost:$port/v1/models" -Method Get -TimeoutSec 5
        Write-Host "✅ API 正常响应" -ForegroundColor Green
        
        if ($response.data) {
            Write-Host "`n可用模型:" -ForegroundColor Cyan
            $response.data | ForEach-Object {
                Write-Host "  - $($_.id)" -ForegroundColor White
            }
        }
    } catch {
        Write-Host "❌ API 调用失败: $_" -ForegroundColor Red
        Write-Host "LM Studio 可能已启动但服务器未开启" -ForegroundColor Yellow
        Write-Host "" -ForegroundColor Gray
        Write-Host "请在 LM Studio 中:" -ForegroundColor Yellow
        Write-Host "  1. 点击左侧 'Local Server'" -ForegroundColor Yellow
        Write-Host "  2. 选择模型" -ForegroundColor Yellow
        Write-Host "  3. 点击 'Start Server'" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ LM Studio 未运行或端口 $port 未开启" -ForegroundColor Red
    Write-Host "" -ForegroundColor Gray
    Write-Host "请先安装并启动 LM Studio:" -ForegroundColor Yellow
    Write-Host "  1. 安装: winget install ElementLabs.LMStudio" -ForegroundColor Yellow
    Write-Host "  2. 从开始菜单启动 LM Studio" -ForegroundColor Yellow
    Write-Host "  3. 搜索并下载模型 (qwen3.5-35b-instruct)" -ForegroundColor Yellow
    Write-Host "  4. 启动本地服务器 (端口 1234)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "检查完成！" -ForegroundColor Cyan