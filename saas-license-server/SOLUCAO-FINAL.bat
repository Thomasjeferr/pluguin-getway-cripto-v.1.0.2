@echo off
chcp 65001 >nul
cls
echo ========================================
echo   SOLUCAO FINAL - INSTALACAO FORCADA
echo ========================================
echo.

cd /d "%~dp0"

echo ETAPA 1: Removendo node_modules antigo (se houver problema)...
if exist "node_modules\mongoose" (
    echo Limpando mongoose antigo...
    rd /s /q "node_modules\mongoose" 2>nul
)

echo.
echo ETAPA 2: Instalando TODAS as dependencias do package.json...
call npm install

echo.
echo ETAPA 3: Verificando se mongoose foi instalado...
if exist "node_modules\mongoose\package.json" (
    echo [OK] Mongoose instalado com sucesso!
) else (
    echo [ERRO] Mongoose NAO foi instalado!
    echo.
    echo Tentando instalar mongoose especificamente...
    call npm install mongoose --save
    if exist "node_modules\mongoose\package.json" (
        echo [OK] Mongoose instalado agora!
    ) else (
        echo [ERRO CRITICO] Mongoose ainda nao foi instalado!
        echo.
        echo Por favor, execute manualmente:
        echo   npm install mongoose
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo   INICIANDO SERVIDOR
echo ========================================
echo.

node server.js

pause
