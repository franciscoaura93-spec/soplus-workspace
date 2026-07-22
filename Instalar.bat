@echo off
title S^&O+ — Instalador
color 0B
cls
echo.
echo   ╔══════════════════════════════════════╗
echo   ║   S^&O+ Ultra Workspace               ║
echo   ║   Instalador v1.0                    ║
echo   ╚══════════════════════════════════════╝
echo.
echo   Este instalador vai:
echo     - Verificar/instalar Python
echo     - Instalar dependencias
echo     - Criar atalho no desktop
echo.
set /p confirm="   Continuar? (S/N): "
if /i not "%confirm%"=="S" exit

powershell -ExecutionPolicy Bypass -File "%~dp0instalar_deps.ps1"
