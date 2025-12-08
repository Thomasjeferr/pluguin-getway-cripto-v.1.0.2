@echo off
chcp 65001 >nul
cls
echo ========================================
echo   SETUP INICIAL - Git + GitHub
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Verificando Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Git nao esta instalado!
    echo.
    echo Instale em: https://git-scm.com/download/win
    pause
    exit /b 1
)
echo Git encontrado!

echo.
echo [2/4] Inicializando repositorio Git...
if exist ".git" (
    echo Repositorio Git ja existe.
) else (
    git init
    echo Repositorio Git inicializado!
)

echo.
echo [3/4] Configurando Git (se necessario)...
git config user.name >nul 2>&1
if errorlevel 1 (
    set /p gitname="Digite seu nome para Git: "
    git config user.name "%gitname%"
)

git config user.email >nul 2>&1
if errorlevel 1 (
    set /p gitemail="Digite seu email para Git: "
    git config user.email "%gitemail%"
)

echo.
echo [4/4] Fazendo primeiro commit...
git add .
git commit -m "Versao inicial - Plugin Cripto Woocommerce completo"

echo.
echo ========================================
echo   SETUP CONCLUIDO!
echo ========================================
echo.
echo PROXIMOS PASSOS:
echo.
echo 1. Crie um repositorio no GitHub:
echo    https://github.com/new
echo.
echo 2. Execute:
echo    git remote add origin https://github.com/SEU_USUARIO/REPO.git
echo    git push -u origin main
echo.
echo 3. Marque esta versao como estavel:
echo    marcar-versao-estavel.bat
echo.
pause
