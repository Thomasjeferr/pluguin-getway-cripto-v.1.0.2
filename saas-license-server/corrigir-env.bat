@echo off
chcp 65001 >nul
echo Corrigindo arquivo .env...
cd /d "%~dp0"

if exist "configuracao.env" (
    copy /Y "configuracao.env" ".env" >nul
    echo Arquivo .env atualizado com a configuracao correta!
) else (
    echo Arquivo configuracao.env nao encontrado!
)

pause
