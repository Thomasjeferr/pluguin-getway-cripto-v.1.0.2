@echo off
chcp 65001 >nul
cls
echo ========================================
echo   VOLTAR PARA VERSAO ANTERIOR
echo ========================================
echo.

cd /d "%~dp0"

echo Listando versoes disponiveis...
echo.
git tag
echo.
git log --oneline -10

echo.
echo ========================================
echo.
echo Opcoes:
echo   1. Voltar para uma TAG (versao marcada)
echo   2. Voltar para um COMMIT especifico
echo   3. Ver historico completo
echo.
set /p opcao="Escolha (1/2/3): "

if "%opcao%"=="1" (
    echo.
    set /p tag="Digite a tag (ex: v1.0.0): "
    if not "%tag%"=="" (
        echo.
        echo ATENCAO: Isso vai mudar seu codigo atual!
        echo Deseja continuar? (S/N)
        set /p confirmar=
        if /i "%confirmar%"=="S" (
            git checkout %tag%
            echo.
            echo Voce esta agora na versao %tag%
            echo Para voltar ao desenvolvimento: git checkout main
        )
    )
) else if "%opcao%"=="2" (
    echo.
    set /p commit="Digite o hash do commit (ex: abc1234): "
    if not "%commit%"=="" (
        echo.
        echo ATENCAO: Isso vai mudar seu codigo atual!
        echo Deseja continuar? (S/N)
        set /p confirmar=
        if /i "%confirmar%"=="S" (
            git checkout %commit%
            echo.
            echo Voce esta agora no commit %commit%
        )
    )
) else if "%opcao%"=="3" (
    git log --oneline --graph --all -20
)

echo.
pause
