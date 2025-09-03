@echo off
title RPS Manager Server
echo ====================================
echo    RPS Manager - Servidor Dedicado
echo ====================================
echo.

cd /d "C:\Users\rodri\OneDrive\Projetos\Rps_Manager"

echo Iniciando servidor com nodemon...
echo.
echo Para parar o servidor: Ctrl+C
echo URL: http://localhost:3000
echo.

npm run dev

pause
