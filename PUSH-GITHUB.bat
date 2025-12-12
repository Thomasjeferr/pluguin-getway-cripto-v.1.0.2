@echo off
chcp 65001 >nul
echo ========================================
echo   ENVIAR CÓDIGO PARA O GITHUB
echo ========================================
echo.

REM Verificar se estamos no diretório correto
if not exist "saas-license-server" (
    echo [ERRO] Este script deve ser executado no diretório raiz do projeto!
    echo [ERRO] Certifique-se de estar em: Pluguin -Woocomerc-Cripto-pix-usdt-antigravity
    pause
    exit /b 1
)

echo [INFO] Diretório do projeto: %CD%
echo.

REM Remover lock file se existir
if exist ".git\index.lock" (
    echo [INFO] Removendo arquivo de lock...
    del /f /q ".git\index.lock" 2>nul
)

REM Inicializar Git se não existir
if not exist ".git" (
    echo [1/6] Inicializando repositório Git...
    git init
    if errorlevel 1 (
        echo [ERRO] Falha ao inicializar Git!
        pause
        exit /b 1
    )
    echo [OK] Repositório Git inicializado!
) else (
    echo [INFO] Repositório Git já existe.
)

echo.
echo [2/6] Adicionando arquivos ao staging...
git add .
if errorlevel 1 (
    echo [ERRO] Falha ao adicionar arquivos!
    pause
    exit /b 1
)
echo [OK] Arquivos adicionados!

echo.
echo [3/6] Criando commit...
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
    echo [AVISO] Falha ao criar commit (pode ser que não haja mudanças)
    echo [INFO] Continuando mesmo assim...
)

echo.
echo [4/6] Renomeando branch para 'main'...
git branch -M main 2>nul

echo.
echo [5/6] Configurando repositório remoto...
git remote remove origin 2>nul
git remote add origin https://github.com/Thomasjeferr/pluguin-getway-cripto-v.1.0.2.git
if errorlevel 1 (
    echo [ERRO] Falha ao adicionar repositório remoto!
    pause
    exit /b 1
)
echo [OK] Repositório remoto configurado!

echo.
echo [6/6] Enviando código para o GitHub...
echo [INFO] Você pode precisar autenticar (use Personal Access Token)
echo [INFO] URL: https://github.com/Thomasjeferr/pluguin-getway-cripto-v.1.0.2
echo.
git push -u origin main
if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao enviar para o GitHub!
    echo.
    echo [INFO] Possíveis causas:
    echo   - Você não está autenticado
    echo   - Você não tem permissão no repositório
    echo.
    echo [SOLUÇÃO] Crie um Personal Access Token:
    echo   1. Acesse: https://github.com/settings/tokens
    echo   2. Generate new token (classic)
    echo   3. Marque a opção "repo"
    echo   4. Use o token como senha quando solicitado
    echo.
    echo [INFO] Ou execute manualmente:
    echo   git push -u origin main
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




