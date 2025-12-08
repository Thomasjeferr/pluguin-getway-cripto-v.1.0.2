@echo off
chcp 65001 >nul
cls
echo ========================================
echo   MARCAR VERSAO ESTAVEL (TAG)
echo ========================================
echo.

cd /d "%~dp0"

echo Digite o numero da versao (ex: 1.0.0):
set /p version=

if "%version%"=="" (
    echo Versao invalida!
    pause
    exit /b 1
)

echo.
echo Criando tag v%version%...
git tag -a v%version% -m "Versao estavel v%version% - Plugin Cripto Woocommerce"

echo.
echo Enviando tag para GitHub...
git push origin v%version%

echo.
echo ========================================
echo   TAG v%version% CRIADA COM SUCESSO!
echo ========================================
echo.
echo Para voltar para esta versao no futuro:
echo   git checkout v%version%
echo.
pause
