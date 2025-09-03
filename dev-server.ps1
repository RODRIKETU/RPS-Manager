# Script para iniciar e testar o servidor RPS Manager
param(
    [switch]$Test,
    [switch]$Stop
)

$projectPath = "C:\Users\rodri\OneDrive\Projetos\Rps_Manager"
$serverUrl = "http://localhost:3000"

if ($Stop) {
    Write-Host "Parando servidor..." -ForegroundColor Yellow
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "Servidor parado." -ForegroundColor Green
    exit
}

# Função para verificar se o servidor está rodando
function Test-Server {
    try {
        $response = Invoke-WebRequest -Uri $serverUrl -UseBasicParsing -TimeoutSec 2
        return $true
    } catch {
        return $false
    }
}

# Parar qualquer instância anterior
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Iniciando servidor RPS Manager..." -ForegroundColor Green
Set-Location $projectPath

# Iniciar o servidor em segundo plano
$job = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    npm run dev
} -ArgumentList $projectPath

# Aguardar o servidor inicializar
Write-Host "Aguardando servidor inicializar..." -ForegroundColor Yellow
$timeout = 0
do {
    Start-Sleep 2
    $timeout += 2
    $serverRunning = Test-Server
    if ($timeout -gt 30) {
        Write-Host "Timeout ao iniciar servidor!" -ForegroundColor Red
        Remove-Job $job -Force
        exit 1
    }
} while (-not $serverRunning)

Write-Host "✅ Servidor iniciado com sucesso em $serverUrl" -ForegroundColor Green

if ($Test) {
    Write-Host "`nExecutando testes..." -ForegroundColor Cyan
    & "$projectPath\test-robust.ps1"
}

Write-Host "`nComandos úteis:" -ForegroundColor Yellow
Write-Host "  Para testar: .\dev-server.ps1 -Test" -ForegroundColor Cyan
Write-Host "  Para parar:  .\dev-server.ps1 -Stop" -ForegroundColor Cyan
Write-Host "  URL do app:  $serverUrl" -ForegroundColor Cyan
