@echo off
echo ======================================
echo   S^&O+ Workspace - Deploy Firebase
echo ======================================
echo.

where firebase >nul 2>nul
if %errorlevel% neq 0 (
    echo A instalar Firebase CLI...
    npm install -g firebase-tools
    echo.
    echo Agora faz login:
    firebase login
)

echo A fazer deploy para Firebase Hosting...
firebase deploy --only hosting

echo.
echo Feito! O site esta em: https://s123o-f3e37.web.app
pause
