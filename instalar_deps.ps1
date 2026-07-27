# S&O+ Ultra Workspace — Instalador de Dependências
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   S&O+ Ultra Workspace — Setup      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Encontrar Python
Write-Host "[1/3] A verificar Python..." -ForegroundColor Yellow
$python = $null
$pyCmd = $null

# Tentar python
try {
    $ver = & python --version 2>&1
    if ($ver -match "Python 3") { $python = $ver; $pyCmd = "python" }
} catch {}

# Tentar py
if (-not $python) {
    try {
        $ver = & py --version 2>&1
        if ($ver -match "Python 3") { $python = $ver; $pyCmd = "py" }
    } catch {}
}

# Tentar caminho hardcoded
if (-not $python) {
    $hardcoded = "C:\Users\Francisco Rodrigues\AppData\Local\Programs\Python\Python312\python.exe"
    if (Test-Path $hardcoded) {
        $ver = & $hardcoded --version 2>&1
        if ($ver -match "Python 3") { $python = $ver; $pyCmd = "`"$hardcoded`"" }
    }
}

# Tentar PATH comum
if (-not $python) {
    $commonPaths = @(
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "C:\Python312\python.exe",
        "C:\Python311\python.exe"
    )
    foreach ($p in $commonPaths) {
        if (Test-Path $p) {
            $ver = & $p --version 2>&1
            if ($ver -match "Python 3") { $python = $ver; $pyCmd = "`"$p`""; break }
        }
    }
}

if ($python) {
    Write-Host "✓ Python encontrado: $python" -ForegroundColor Green
} else {
    Write-Host "Python nao encontrado. A descarregar Python 3.12..." -ForegroundColor Yellow
    $url = "https://www.python.org/ftp/python/3.12.9/python-3.12.9-amd64.exe"
    $installer = "$env:TEMP\python_installer.exe"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing
        Write-Host "A instalar Python (pode demorar um minuto)..." -ForegroundColor Yellow
        Start-Process $installer -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_pip=1" -Wait
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        $pyCmd = "python"
        Write-Host "✓ Python instalado com sucesso!" -ForegroundColor Green
    } catch {
        Write-Host "✗ Erro ao instalar Python: $_" -ForegroundColor Red
    }
}

# Instalar dependências
Write-Host "[2/3] A instalar dependências..." -ForegroundColor Yellow
if ($pyCmd) {
    & $pyCmd -m pip install --user flask requests 2>&1 | Out-Null
    & $pyCmd -m pip install --user -r (Join-Path $PSScriptRoot "requirements.txt") 2>&1 | Out-Null
}
Write-Host "✓ Dependências instaladas" -ForegroundColor Green

# Criar atalho no desktop
Write-Host "[3/3] A criar atalho no desktop..." -ForegroundColor Yellow
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\S&O+ Workspace.lnk")
    $Shortcut.TargetPath = Join-Path $PSScriptRoot "iniciar.bat"
    $Shortcut.WorkingDirectory = $PSScriptRoot
    $Shortcut.Description = "S&O+ Ultra Workspace"
    $Shortcut.Save()
    Write-Host "✓ Atalho criado no desktop" -ForegroundColor Green
} catch {
    Write-Host "⚠ Não foi possível criar atalho: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Instalação concluída!" -ForegroundColor Green
Write-Host "  Abre 'S&O+ Workspace' no desktop" -ForegroundColor Green
Write-Host "══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Read-Host "Pressiona Enter para fechar"
