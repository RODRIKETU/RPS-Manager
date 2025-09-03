# Script de Teste Robusto do RPS Manager
Write-Host "=== TESTE ROBUSTO DO RPS MANAGER ===" -ForegroundColor Green

# Teste 1: Verificar se servidor está rodando
Write-Host "`n1. Testando conectividade do servidor..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/empresas" -Method GET
    Write-Host "✅ Servidor respondendo - Empresas encontradas: $($response.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao conectar com o servidor: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Teste 2: Testar página principal
Write-Host "`n2. Testando página principal..." -ForegroundColor Yellow
try {
    $html = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing
    if ($html.Content -match "<title>.*RPS Manager.*</title>") {
        Write-Host "✅ Página principal carregando corretamente" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Página principal carregou mas título não encontrado" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erro ao acessar página principal: $($_.Exception.Message)" -ForegroundColor Red
}

# Teste 3: Criar empresa
Write-Host "`n3. Testando criação de empresa..." -ForegroundColor Yellow
$empresaTest = @{
    cnpj = "12.345.678/0001-90"
    razao_social = "Empresa Teste LTDA"
    nome_fantasia = "EmpresaTeste"
    inscricao_municipal = "123456"
    endereco = "Rua Teste, 123"
    cidade = "São Paulo"
    estado = "SP"
    cep = "01234-567"
    telefone = "(11) 1234-5678"
    email = "contato@empresateste.com"
} | ConvertTo-Json

try {
    $newEmpresa = Invoke-RestMethod -Uri "http://localhost:3000/api/empresas" -Method POST -Body $empresaTest -ContentType "application/json"
    Write-Host "✅ Empresa criada com sucesso - ID: $($newEmpresa.id)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao criar empresa: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Resposta do servidor: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# Teste 4: Listar empresas novamente
Write-Host "`n4. Testando listagem após criação..." -ForegroundColor Yellow
try {
    $empresas = Invoke-RestMethod -Uri "http://localhost:3000/api/empresas" -Method GET
    Write-Host "✅ Total de empresas: $($empresas.Count)" -ForegroundColor Green
    foreach ($empresa in $empresas) {
        Write-Host "  - $($empresa.razao_social) (CNPJ: $($empresa.cnpj))" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Erro ao listar empresas: $($_.Exception.Message)" -ForegroundColor Red
}

# Teste 5: Testar outras APIs
Write-Host "`n5. Testando outras APIs..." -ForegroundColor Yellow
try {
    $rps = Invoke-RestMethod -Uri "http://localhost:3000/api/rps" -Method GET
    Write-Host "✅ API de RPS respondendo - Total: $($rps.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro na API de RPS: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== TESTE CONCLUÍDO ===" -ForegroundColor Green
