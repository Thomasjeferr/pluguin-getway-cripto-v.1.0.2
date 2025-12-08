@echo off
chcp 65001 >nul
cls
echo ========================================
echo   BACKUP RAPIDO - Git + GitHub
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando status do Git...
git status --short
if errorlevel 1 (
    echo.
    echo ERRO: Git nao inicializado!
    echo Execute: git init
    pause
    exit /b 1
)

echo.
echo [2/3] Adicionando arquivos...
git add .

echo.
echo [3/3] Criando commit...
set "timestamp=%date% %time%"
git commit -m "Backup automatico - %timestamp%"
if errorlevel 1 (
    echo Nenhuma mudanca para commitar.
) else (
    echo Commit criado com sucesso!
)

echo.
echo Enviando para GitHub...
git push
if errorlevel 1 (
    echo.
    echo AVISO: Nao foi possivel enviar para GitHub.
    echo Verifique se o repositorio remoto esta configurado.
    echo Execute: git remote add origin https://github.com/USUARIO/REPO.git
)

echo.
echo ========================================
echo   BACKUP CONCLUIDO!
echo ========================================
echo.
pause
