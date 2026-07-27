# S&O+ Ultra Workspace — Instalador de Dependencias v3.2
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   S+O Ultra Workspace - Setup v3.2" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Encontrar Python
Write-Host "[1/4] A verificar Python..." -ForegroundColor Yellow
$pyCmd = $null

# Tentar python
try {
    $ver = & python --version 2>&1
    if ($ver -match "Python 3") { $pyCmd = "python" }
} catch {}

# Tentar py
if (-not $pyCmd) {
    try {
        $ver = & py --version 2>&1
        if ($ver -match "Python 3") { $pyCmd = "py" }
    } catch {}
}

# Tentar caminhos comuns
if (-not $pyCmd) {
    $paths = @(
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "C:\Python312\python.exe",
        "C:\Python311\python.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) {
            $ver = & $p --version 2>&1
            if ($ver -match "Python 3") { $pyCmd = "`"$p`""; break }
        }
    }
}

if ($pyCmd) {
    Write-Host "  Python encontrado!" -ForegroundColor Green
} else {
    Write-Host "  Python nao encontrado. A instalar Python 3.12..." -ForegroundColor Yellow
    $url = "https://www.python.org/ftp/python/3.12.9/python-3.12.9-amd64.exe"
    $installer = "$env:TEMP\python_installer.exe"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing
        Write-Host "  A instalar Python (pode demorar 1-2 minutos)..." -ForegroundColor Yellow
        Start-Process $installer -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_pip=1" -Wait
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        $pyCmd = "python"
        Write-Host "  Python instalado!" -ForegroundColor Green
    } catch {
        Write-Host "  ERRO ao instalar Python: $_" -ForegroundColor Red
    }
}

# Instalar pip + dependencias base
Write-Host "[2/4] A instalar dependencias base..." -ForegroundColor Yellow
if ($pyCmd) {
    try {
        & $pyCmd -m pip install --upgrade pip 2>&1 | Out-Null
    } catch {}
    & $pyCmd -m pip install flask requests duckduckgo-search 2>&1 | Out-Null
    Write-Host "  Dependencias base instaladas" -ForegroundColor Green
}

# Instalar pywebview (principal!)
Write-Host "[3/4] A instalar pywebview (Edge WebView2)..." -ForegroundColor Yellow
if ($pyCmd) {
    & $pyCmd -m pip install pywebview 2>&1 | Out-Null
    # Verificar se instalou
    $check = & $pyCmd -c "import webview; print('OK')" 2>&1
    if ($check -match "OK") {
        Write-Host "  pywebview instalado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "  AVISO: pywebview pode nao ter instalado corretamente" -ForegroundColor Yellow
        Write-Host "  Tenta manualmente: pip install pywebview" -ForegroundColor Yellow
    }
}

# Instalar resto do requirements.txt
Write-Host "  A instalar restantes dependencias..." -ForegroundColor Yellow
if ($pyCmd) {
    & $pyCmd -m pip install -r (Join-Path $PSScriptRoot "requirements.txt") 2>&1 | Out-Null
    Write-Host "  Todas as dependencias instaladas" -ForegroundColor Green
}

# Instalar playwright browsers (opcional)
Write-Host "[4/4] A verificar Playwright..." -ForegroundColor Yellow
if ($pyCmd) {
    & $pyCmd -m pip install playwright 2>&1 | Out-Null
    & $pyCmd -m playwright install chromium 2>&1 | Out-Null
    Write-Host "  Playwright configurado" -ForegroundColor Green
}

# Criar atalho no desktop
Write-Host "A criar atalho no desktop..." -ForegroundColor Yellow
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\S+O Ultra Workspace.lnk")
    $Shortcut.TargetPath = Join-Path $PSScriptRoot "iniciar.bat"
    $Shortcut.WorkingDirectory = $PSScriptRoot
    $Shortcut.Description = "S+O Ultra Workspace"
    $Shortcut.IconLocation = Join-Path $PSScriptRoot "static\favicon.ico"
    $Shortcut.Save()
    Write-Host "  Atalho criado no desktop" -ForegroundColor Green
} catch {
    Write-Host "  Nao foi possivel criar atalho: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Instalacao concluida!" -ForegroundColor Green
Write-Host "  Abre 'S+O Ultra Workspace' no desktop" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Pressiona Enter para fechar"
