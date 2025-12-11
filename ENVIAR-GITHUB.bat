@echo off
chcp 65001 >nul
echo ========================================
echo   ENVIANDO CÓDIGO PARA O GITHUB
echo ========================================
echo.

REM Verificar se estamos no diretório correto
cd /d "%~dp0"
if not exist "saas-license-server" (
    echo [ERRO] Este script deve ser executado no diretório raiz do projeto!
    pause
    exit /b 1
)

echo [INFO] Diretório atual: %CD%
echo.

REM Remover lock file se existir
if exist ".git\index.lock" (
    echo [INFO] Removendo lock file...
    del /f /q ".git\index.lock" 2>nul
)

REM Verificar se Git está inicializado
if not exist ".git" (
    echo [1/6] Inicializando repositório Git...
    git init
    if errorlevel 1 (
        echo [ERRO] Falha ao inicializar Git!
        pause
        exit /b 1
    )
) else (
    echo [INFO] Git já está inicializado
)

echo.
echo [2/6] Configurando repositório remoto...
git remote remove origin 2>nul
git remote add origin https://github.com/Thomasjeferr/pluguin-getway-cripto-v.1.0.2.git
if errorlevel 1 (
    echo [ERRO] Falha ao adicionar repositório remoto!
    pause
    exit /b 1
)
echo [OK] Repositório remoto configurado!

echo.
echo [3/6] Adicionando arquivos ao staging...
git add .
if errorlevel 1 (
    echo [ERRO] Falha ao adicionar arquivos!
    pause
    exit /b 1
)
echo [OK] Arquivos adicionados!

echo.
echo [4/6] Criando commit...
git commit -m "feat: Implementação completa do plugin WooCommerce Binance Pix + Servidor SaaS

- ✅ Correção de todas as vulnerabilidades XSS
- ✅ Correção de erros de sintaxe EJS
- ✅ Implementação de validação de templates
- ✅ Correção de credenciais expostas
- ✅ Implementação de função de licença
- ✅ Sistema de logging profissional
- ✅ Validação de entrada consistente
- ✅ Sanitização de regex
- ✅ Cookies seguros
- ✅ Versão centralizada do plugin
- ✅ Defensive programming em templates EJS"
if errorlevel 1 (
    echo [AVISO] Nenhuma mudança para commitar ou commit já existe
)

echo.
echo [5/6] Renomeando branch para 'main'...
git branch -M main 2>nul
if errorlevel 1 (
    echo [AVISO] Branch pode já estar como 'main' ou não há commits
)

echo.
echo [6/6] Enviando código para o GitHub...
echo [INFO] Você pode precisar autenticar (use Personal Access Token)
echo.
git push -u origin main
if errorlevel 1 (
    echo.
    echo ========================================
    echo   ERRO AO ENVIAR PARA O GITHUB
    echo ========================================
    echo.
    echo Possíveis causas:
    echo   1. Você não está autenticado
    echo   2. O repositório não existe ou você não tem permissão
    echo   3. Há conflitos com o repositório remoto
    echo.
    echo SOLUÇÕES:
    echo.
    echo 1. Criar Personal Access Token:
    echo    - Acesse: https://github.com/settings/tokens
    echo    - Generate new token (classic)
    echo    - Marque a opção "repo"
    echo    - Use o token como senha quando solicitado
    echo.
    echo 2. Se o repositório já tem conteúdo, tente:
    echo    git pull origin main --allow-unrelated-histories
    echo    git push -u origin main
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅ SUCESSO!
echo ========================================
echo.
echo Seu código foi enviado para o GitHub!
echo Acesse: https://github.com/Thomasjeferr/pluguin-getway-cripto-v.1.0.2
echo.
pause

