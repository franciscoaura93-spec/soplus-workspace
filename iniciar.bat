@echo off
title S&O+ Ultra Workspace
color 0B
cls
echo.
echo   ╔══════════════════════════════════════╗
echo   ║   S^&O+ Ultra Workspace v1.0         ║
echo   ║   A arrancar...                      ║
echo   ╚══════════════════════════════════════╝
echo.
cd /d "%~dp0"

:: Tentar encontrar Python
where python >nul 2>&1
if %errorlevel%==0 (
    python app.py
    goto :end
)

where py >nul 2>&1
if %errorlevel%==0 (
    py app.py
    goto :end
)

:: Caminho hardcoded como fallback
if exist "C:\Users\Francisco Rodrigues\AppData\Local\Programs\Python\Python312\python.exe" (
    "C:\Users\Francisco Rodrigues\AppData\Local\Programs\Python\Python312\python.exe" app.py
    goto :end
)

echo   [ERRO] Python nao encontrado!
echo   Instala Python em: https://www.python.org/downloads/
echo.
pause

:end
pause
