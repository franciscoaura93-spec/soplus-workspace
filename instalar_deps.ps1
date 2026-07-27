# S&O+ Ultra Workspace — Instalador de Dependencias v3.2
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   S+O Ultra Workspace - Setup v3.2" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Encontrar Python
Write-Host "[1/3] A verificar Python..." -ForegroundColor Yellow
$pyCmd = $null

try { $ver = & python --version 2>&1; if ($ver -match "Python 3") { $pyCmd = "python" } } catch {}
if (-not $pyCmd) { try { $ver = & py --version 2>&1; if ($ver -match "Python 3") { $pyCmd = "py" } } catch {} }
if (-not $pyCmd) {
    $paths = @(
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "C:\Python312\python.exe",
        "C:\Python311\python.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { $ver = & $p --version 2>&1; if ($ver -match "Python 3") { $pyCmd = "`"$p`""; break } }
    }
}

if ($pyCmd) {
    Write-Host "  Python encontrado!" -ForegroundColor Green
} else {
    Write-Host "  A instalar Python 3.12..." -ForegroundColor Yellow
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.12.9/python-3.12.9-amd64.exe" -OutFile "$env:TEMP\python_inst.exe" -UseBasicParsing
        Start-Process "$env:TEMP\python_inst.exe" -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_pip=1" -Wait
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        $pyCmd = "python"
        Write-Host "  Python instalado!" -ForegroundColor Green
    } catch { Write-Host "  ERRO: $_" -ForegroundColor Red }
}

# Instalar TUDO de uma vez
Write-Host "[2/3] A instalar dependencias..." -ForegroundColor Yellow
if ($pyCmd) {
    & $pyCmd -m pip install --upgrade pip 2>&1 | Out-Null
    & $pyCmd -m pip install -r (Join-Path $PSScriptRoot "requirements.txt") 2>&1 | Out-Null
    $check = & $pyCmd -c "import webview; print('pywebview OK')" 2>&1
    if ($check -match "OK") { Write-Host "  pywebview OK!" -ForegroundColor Green }
    else { Write-Host "  AVISO: pywebview pode nao ter instalado" -ForegroundColor Yellow }
    Write-Host "  Dependencias instaladas!" -ForegroundColor Green
}

# Criar atalho
Write-Host "[3/3] A criar atalho no desktop..." -ForegroundColor Yellow
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\S+O Ultra Workspace.lnk")
    $Shortcut.TargetPath = Join-Path $PSScriptRoot "iniciar.bat"
    $Shortcut.WorkingDirectory = $PSScriptRoot
    $Shortcut.IconLocation = Join-Path $PSScriptRoot "static\favicon.ico"
    $Shortcut.Save()
    Write-Host "  Atalho criado!" -ForegroundColor Green
} catch { Write-Host "  Nao foi possivel criar atalho" -ForegroundColor Yellow }

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Instalacao concluida!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Read-Host "Pressiona Enter para fechar"
