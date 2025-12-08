@echo off
chcp 65001 >nul
cls
title Servidor SaaS - Plugin Cripto Woocommerce

echo.
echo ========================================
echo   INICIANDO SERVIDOR
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando mongoose...
if not exist "node_modules\mongoose\package.json" (
    echo Mongoose nao encontrado. Instalando...
    call npm install mongoose --silent
    if errorlevel 1 (
        echo ERRO ao instalar mongoose!
        pause
        exit /b 1
    )
    echo Mongoose instalado!
) else (
    echo Mongoose OK!
)

echo.
echo [2/3] Verificando outras dependencias...
call npm install --silent

echo.
echo [3/3] Iniciando servidor...
echo.
echo ========================================
echo   SERVIDOR INICIANDO...
echo ========================================
echo.

node server.js

pause
