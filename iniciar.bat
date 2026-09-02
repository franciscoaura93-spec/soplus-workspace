@echo off
title S&O+ Ultra Workspace
color 0B
cls
echo.
echo   ╔══════════════════════════════════════╗
echo   ║   S^&O+ Ultra Workspace v3.4         ║
echo   ║   A arrancar em pywebview...         ║
echo   ╚══════════════════════════════════════╝
echo.
cd /d "%~dp0"

where python >nul 2>&1
if %errorlevel%==0 (
    python launcher.py
    goto :end
)

where py >nul 2>&1
if %errorlevel%==0 (
    py launcher.py
    goto :end
)

if exist "C:\Users\Francisco Rodrigues\AppData\Local\Programs\Python\Python312\python.exe" (
    "C:\Users\Francisco Rodrigues\AppData\Local\Programs\Python\Python312\python.exe" launcher.py
    goto :end
)

echo   [ERRO] Python nao encontrado!
echo   Instala Python em: https://www.python.org/downloads/
echo.
pause

:end
