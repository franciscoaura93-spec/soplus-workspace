@echo off
title S^&O+ — Gerar Instalador.exe
color 0B
cls
echo.
echo   ╔══════════════════════════════════════╗
echo   ║   Gerador de Instalador .exe          ║
echo   ╚══════════════════════════════════════╝
echo.
echo   Opcoes disponiveis:
echo.
echo   [1] Inno Setup (recomendado)
echo       - Descarrega: https://jrsoftware.org/isdl.php
echo       - Abre o ficheiro instalador.iss
echo       - Clica Build > Compile
echo       - Gera: installer_output\S&O+Workspace-Instalador.exe
echo.
echo   [2] Bat To Exe Converter
echo       - Descarrega: https://battoexeconverter.com/
echo       - Converte Instalar.bat em Instalar.exe
echo       - Mais simples mas sem wizard
echo.
echo   [3] Portable (zip)
echo       - Compacta tudo num .zip
echo       - User extrai e clica em Instalar.bat
echo.
set /p opt="   Escolhe (1/2/3): "

if "%opt%"=="1" (
    echo.
    echo   A abrir instalador.iss...
    if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
        "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "%~dp0instalador.iss"
    ) else if exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
        "C:\Program Files\Inno Setup 6\ISCC.exe" "%~dp0instalador.iss"
    ) else (
        echo   [ERRO] Inno Setup nao encontrado!
        echo   Descarrega: https://jrsoftware.org/isdl.php
        echo   Depois abre o ficheiro instalador.iss no Inno Setup
        start https://jrsoftware.org/isdl.php
    )
)

if "%opt%"=="2" (
    echo.
    echo   Descarrega: https://battoexeconverter.com/
    start https://battoexeconverter.com/
    echo   Converte: Instalar.bat ^> Instalar.exe
)

if "%opt%"=="3" (
    echo.
    echo   A criar pacote portable...
    powershell -Command "Compress-Archive -Path '%~dp0app.py','%~dp0requirements.txt','%~dp0iniciar.bat','%~dp0Instalar.bat','%~dp0instalar_deps.ps1','%~dp0static','%~dp0templates' -DestinationPath '%~dp0S&O+Workspace-Portable.zip' -Force"
    echo   Criado: S^&O+Workspace-Portable.zip
)

echo.
pause
