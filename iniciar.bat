@echo off
title S&O+ Ultra Workspace
color 0B
cls
echo.
echo   ╔══════════════════════════════════════╗
echo   ║   S^&O+ Ultra Workspace v3.0         ║
echo   ╚══════════════════════════════════════╝
echo.
echo   [1] Abrir Workspace
echo   [2] Abrir Browser
echo   [3] Ambos
echo.
set /p choice="Escolhe uma opcao (1-3): "

cd /d "%~dp0"

if "%choice%"=="2" goto :browser
if "%choice%"=="3" goto :both

:: Default: Workspace
goto :workspace

:both
start "" cmd /c "cd /d "%~dp0" && python browser.py"
:workspace
goto :start

:browser
python browser.py
goto :end

:start
:: Tentar encontrar Python
where python >nul 2>&1
if %errorlevel%==0 (
    start "" python app.py
    timeout /t 2 >nul
    start http://localhost:5000
    goto :end
)

where py >nul 2>&1
if %errorlevel%==0 (
    start "" py app.py
    timeout /t 2 >nul
    start http://localhost:5000
    goto :end
)

if exist "C:\Users\Francisco Rodrigues\AppData\Local\Programs\Python\Python312\python.exe" (
    start "" "C:\Users\Francisco Rodrigues\AppData\Local\Programs\Python\Python312\python.exe" app.py
    timeout /t 2 >nul
    start http://localhost:5000
    goto :end
)

echo   [ERRO] Python nao encontrado!
echo   Instala Python em: https://www.python.org/downloads/
echo.
pause

:end
