@echo off
chcp 65001 >nul
echo ========================================
echo   CONECTAR PROJETO AO GITHUB
echo ========================================
echo.

REM Verificar se estamos no diretório correto
if not exist "saas-license-server" (
    echo [ERRO] Este script deve ser executado no diretório raiz do projeto!
    echo [ERRO] Certifique-se de estar em: Pluguin -Woocomerc-Cripto-pix-usdt-antigravity
    pause
    exit /b 1
)

echo [1/6] Inicializando repositório Git...
if exist ".git" (
    echo [INFO] Repositório Git já existe. Continuando...
) else (
    git init
    if errorlevel 1 (
        echo [ERRO] Falha ao inicializar Git!
        pause
        exit /b 1
    )
    echo [OK] Repositório Git inicializado!
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
echo [3/6] Criando commit inicial...
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
    echo [ERRO] Falha ao criar commit!
    echo [INFO] Pode ser que não haja mudanças para commitar.
    pause
    exit /b 1
)
echo [OK] Commit criado!

echo.
echo [4/6] Renomeando branch para 'main'...
git branch -M main
if errorlevel 1 (
    echo [AVISO] Falha ao renomear branch (pode já estar como main)
)

echo.
echo ========================================
echo   PRÓXIMOS PASSOS MANUAIS
echo ========================================
echo.
echo 1. Acesse: https://github.com/new
echo 2. Crie um novo repositório (escolha um nome)
echo 3. NÃO marque "Add README" ou "Add .gitignore"
echo 4. Copie a URL do repositório (exemplo:)
echo    https://github.com/SEU-USUARIO/NOME-REPOSITORIO.git
echo.
echo 5. Execute os seguintes comandos:
echo.
echo    git remote add origin https://github.com/SEU-USUARIO/NOME-REPOSITORIO.git
echo    git push -u origin main
echo.
echo ========================================
echo   OU USE O SCRIPT INTERATIVO ABAIXO
echo ========================================
echo.

set /p GITHUB_URL="Cole a URL do seu repositório GitHub: "

if "%GITHUB_URL%"=="" (
    echo [INFO] URL não fornecida. Execute manualmente os comandos acima.
    pause
    exit /b 0
)

echo.
echo [5/6] Adicionando repositório remoto...
git remote remove origin 2>nul
git remote add origin %GITHUB_URL%
if errorlevel 1 (
    echo [ERRO] Falha ao adicionar repositório remoto!
    echo [INFO] Verifique se a URL está correta.
    pause
    exit /b 1
)
echo [OK] Repositório remoto adicionado!

echo.
echo [6/6] Enviando código para o GitHub...
echo [INFO] Você pode precisar autenticar (use Personal Access Token)
git push -u origin main
if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao enviar para o GitHub!
    echo.
    echo [INFO] Possíveis causas:
    echo   - Você não está autenticado
    echo   - A URL do repositório está incorreta
    echo   - Você não tem permissão no repositório
    echo.
    echo [SOLUÇÃO] Crie um Personal Access Token:
    echo   1. Acesse: https://github.com/settings/tokens
    echo   2. Generate new token (classic)
    echo   3. Marque a opção "repo"
    echo   4. Use o token como senha quando solicitado
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
echo Acesse: %GITHUB_URL%
echo.
pause

