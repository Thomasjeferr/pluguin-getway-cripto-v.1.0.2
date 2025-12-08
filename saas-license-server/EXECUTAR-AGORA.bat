@echo off
chcp 65001 >nul
echo ========================================
echo   INSTALANDO DEPENDENCIAS E INICIANDO
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Instalando mongoose...
call npm install mongoose
if errorlevel 1 (
    echo.
    echo ERRO ao instalar mongoose!
    echo Verifique se o npm esta instalado.
    pause
    exit /b 1
)

echo.
echo [2/2] Iniciando servidor...
echo.
echo ========================================
echo   SERVIDOR INICIANDO...
echo ========================================
echo.

node server.js

pause
