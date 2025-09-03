@echo off
title RPS Manager Tests
echo ====================================
echo    RPS Manager - Testes Automaticos
echo ====================================
echo.

cd /d "C:\Users\rodri\OneDrive\Projetos\Rps_Manager"

echo Aguardando servidor estar disponivel...
timeout /t 3 /nobreak >nul

echo.
echo === EXECUTANDO TESTES ===
echo.

echo 1. Testando conectividade...
curl -s http://localhost:3000/api/empresas
echo.

echo 2. Testando pagina principal...
curl -s http://localhost:3000 | findstr "title"
echo.

echo 3. Testando criacao de empresa...
curl -X POST http://localhost:3000/api/empresas -H "Content-Type: application/json" -d "{\"cnpj\":\"12.345.678/0001-90\",\"razao_social\":\"Empresa Teste LTDA\",\"nome_fantasia\":\"EmpresaTeste\",\"inscricao_municipal\":\"123456\",\"endereco\":\"Rua Teste, 123\",\"cidade\":\"Sao Paulo\",\"estado\":\"SP\",\"cep\":\"01234-567\",\"telefone\":\"(11) 1234-5678\",\"email\":\"contato@empresateste.com\"}"
echo.

echo 4. Testando listagem pos-criacao...
curl -s http://localhost:3000/api/empresas
echo.

echo === TESTES CONCLUIDOS ===
echo.
pause
