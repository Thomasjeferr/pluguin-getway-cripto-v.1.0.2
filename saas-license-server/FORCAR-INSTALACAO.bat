@echo off
chcp 65001 >nul
cls
echo ========================================
echo   FORCANDO INSTALACAO DO MONGOOSE
echo ========================================
echo.

cd /d "%~dp0"

echo Removendo node_modules\mongoose se existir...
if exist "node_modules\mongoose" (
    rd /s /q "node_modules\mongoose" 2>nul
    echo Limpeza concluida.
)

echo.
echo Instalando mongoose com npm...
echo.

call npm install mongoose --save --force

echo.
echo ========================================
if exist "node_modules\mongoose\package.json" (
    echo   SUCESSO! Mongoose instalado!
    echo ========================================
    echo.
    echo Iniciando servidor...
    echo.
    node server.js
) else (
    echo   ERRO! Mongoose NAO foi instalado!
    echo ========================================
    echo.
    echo Por favor, execute manualmente:
    echo   npm install mongoose
    echo.
)

pause
