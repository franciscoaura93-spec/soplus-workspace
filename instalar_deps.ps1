# S&O+ Ultra Workspace — Instalador de Dependencias v3.4
# Não-bloqueante: nunca espera por input e sai sempre com código de saída.
$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   S+O Ultra Workspace - Setup v3.4" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# --- Localizar Python (atualizando o PATH em memória se acabou de ser instalado) ---
Write-Host "[1/3] A verificar Python..." -ForegroundColor Yellow
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + $env:Path
$pyCmd = $null

function Test-Python([string]$cmd) {
    try {
        $ver = & $cmd --version 2>&1
        return ($ver -match "Python 3")
    } catch { return $false }
}

if (Test-Python "python") { $pyCmd = "python" }
elseif (Test-Python "py") { $pyCmd = "py" }
else {
    $paths = @(
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe",
        "C:\Python312\python.exe",
        "C:\Python311\python.exe",
        "C:\Python310\python.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) {
            $ver = & $p --version 2>&1
            if ($ver -match "Python 3") { $pyCmd = "`"$p`""; break }
        }
    }
}

if ($pyCmd) {
    Write-Host "  Python encontrado." -ForegroundColor Green
} else {
    Write-Host "  Python nao encontrado. A descarregar e instalar Python 3.12..." -ForegroundColor Yellow
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.12.9/python-3.12.9-amd64.exe" -OutFile "$env:TEMP\python_inst.exe" -UseBasicParsing
        $p = Start-Process "$env:TEMP\python_inst.exe" -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_pip=1" -Wait -PassThru
        Start-Sleep -Seconds 3
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + $env:Path
        if (Test-Python "python") { $pyCmd = "python" }
        Write-Host "  Python instalado." -ForegroundColor Green
    } catch {
        Write-Host "  ERRO ao instalar Python: $_" -ForegroundColor Red
    }
}

# --- Instalar dependencias (sem prompts, timeouts generosos) ---
Write-Host "[2/3] A instalar dependencias..." -ForegroundColor Yellow
$depExit = 0
if ($pyCmd) {
    $req = Join-Path $PSScriptRoot "requirements.txt"
    try {
        & $pyCmd -m pip install --no-input --disable-pip-version-check -r $req --timeout 120 --retries 3
        $depExit = $LASTEXITCODE
    } catch {
        Write-Host "  ERRO no pip: $_" -ForegroundColor Red
        $depExit = 1
    }
    if ($depExit -eq 0) {
        $check = & $pyCmd -c "import webview; print('pywebview OK')" 2>&1
        if ($check -match "OK") { Write-Host "  pywebview OK!" -ForegroundColor Green }
        else { Write-Host "  AVISO: pywebview pode nao ter instalado corretamente." -ForegroundColor Yellow }
    } else {
        Write-Host "  Falha ao instalar dependencias." -ForegroundColor Red
    }
}

# --- Criar atalho no desktop ---
Write-Host "[3/3] A criar atalho no desktop..." -ForegroundColor Yellow
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\S+O Ultra Workspace.lnk")
    $Shortcut.TargetPath = Join-Path $PSScriptRoot "iniciar.bat"
    $Shortcut.WorkingDirectory = $PSScriptRoot
    $Shortcut.IconLocation = Join-Path $PSScriptRoot "static\favicon.ico"
    $Shortcut.Save()
    Write-Host "  Atalho criado!" -ForegroundColor Green
} catch {
    Write-Host "  Nao foi possivel criar o atalho." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Instalacao concluida!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Nunca bloquear a espera de input; encerrar sempre
exit $depExit
