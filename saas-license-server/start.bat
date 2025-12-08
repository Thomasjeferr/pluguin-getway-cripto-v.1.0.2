@echo off
cd /d "%~dp0"
echo Instalando dependencias...
call npm install
echo.
echo Iniciando servidor...
node server.js
pause
