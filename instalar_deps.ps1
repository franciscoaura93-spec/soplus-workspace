# S&O+ Ultra Workspace — Instalador de Dependências
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   S&O+ Ultra Workspace — Setup      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar Python
Write-Host "[1/3] A verificar Python..." -ForegroundColor Yellow
$python = $null
try { $python = (python --version 2>&1) } catch {}
if (-not $python -or $python -notmatch "Python 3") {
    try { $python = (py --version 2>&1) } catch {}
    if (-not $python -or $python -notmatch "Python 3") {
        Write-Host "Python não encontrado. A descarregar Python 3.12..." -ForegroundColor Yellow
        $url = "https://www.python.org/ftp/python/3.12.9/python-3.12.9-amd64.exe"
        $installer = "$env:TEMP\python_installer.exe"
        Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing
        Write-Host "A instalar Python (pode demorar um minuto)..." -ForegroundColor Yellow
        Start-Process $installer -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_pip=1" -Wait
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Host "Python instalado com sucesso!" -ForegroundColor Green
    }
}
Write-Host "✓ Python encontrado" -ForegroundColor Green

# Instalar dependências
Write-Host "[2/3] A instalar dependências..." -ForegroundColor Yellow
& python -m pip install --user --break-system-packages flask requests 2>&1 | Out-Null
& python -m pip install --user --break-system-packages -r (Join-Path $PSScriptRoot "requirements.txt") 2>&1 | Out-Null
Write-Host "✓ Dependências instaladas" -ForegroundColor Green

# Criar atalho no desktop
Write-Host "[3/3] A criar atalho no desktop..." -ForegroundColor Yellow
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\S&O+ Workspace.lnk")
$Shortcut.TargetPath = Join-Path $PSScriptRoot "iniciar.bat"
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Description = "S&O+ Ultra Workspace"
$Shortcut.Save()
Write-Host "✓ Atalho criado no desktop" -ForegroundColor Green

Write-Host ""
Write-Host "══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Instalação concluída!" -ForegroundColor Green
Write-Host "  Abre 'S&O+ Workspace' no desktop" -ForegroundColor Green
Write-Host "══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Read-Host "Pressiona Enter para fechar"
