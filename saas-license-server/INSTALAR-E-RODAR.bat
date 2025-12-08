@echo off
chcp 65001 >nul
cls
title Instalando e Iniciando Servidor

cd /d "%~dp0"

echo.
echo ========================================
echo   INSTALACAO FORCADA DE DEPENDENCIAS
echo ========================================
echo.

echo [1/3] Verificando Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    echo Por favor, instale o Node.js primeiro.
    pause
    exit /b 1
)
echo Node.js encontrado!

echo.
echo [2/3] Verificando npm...
where npm >nul 2>&1
if errorlevel 1 (
    echo ERRO: npm nao encontrado!
    pause
    exit /b 1
)
echo npm encontrado!

echo.
echo [3/3] Instalando dependencias (isso pode demorar)...
call npm install --loglevel=error
if errorlevel 1 (
    echo.
    echo ERRO na instalacao!
    echo Tentando instalar mongoose especificamente...
    call npm install mongoose --save
)

echo.
echo Verificando se mongoose foi instalado...
if exist "node_modules\mongoose\package.json" (
    echo [OK] Mongoose instalado!
) else (
    echo [ERRO] Mongoose NAO foi instalado!
    echo.
    echo Execute manualmente no terminal:
    echo   cd "%CD%"
    echo   npm install mongoose
    pause
    exit /b 1
)

echo.
echo ========================================
echo   INICIANDO SERVIDOR
echo ========================================
echo.

node server.js

pause
