[Setup]
AppName=S+O Ultra Workspace
AppVersion=2.2
AppPublisher=S+O+
DefaultDirName={autopf}\S+O Workspace
DefaultGroupName=S+O Ultra Workspace
OutputDir=installer_output
OutputBaseFilename=S+O-Workspace-Instalador
SetupIconFile=static\favicon.ico
UninstallDisplayIcon={app}\static\favicon.ico
Compression=lzma2/ultra64
SolidCompression=yes
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
VersionInfoVersion=2.2.0.0
VersionInfoDescription=S.O+ Ultra Workspace Installer

[Languages]
Name: "portuguese"; MessagesFile: "compiler:Languages\Portuguese.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "french"; MessagesFile: "compiler:Languages\French.isl"
Name: "german"; MessagesFile: "compiler:Languages\German.isl"
Name: "italian"; MessagesFile: "compiler:Languages\Italian.isl"
Name: "dutch"; MessagesFile: "compiler:Languages\Dutch.isl"
Name: "polish"; MessagesFile: "compiler:Languages\Polish.isl"
Name: "brazilian"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}:"

[Files]
Source: "app.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "moodle.py"; DestDir: "{app}"; Flags: ignoreversion
Source: ".env"; DestDir: "{app}"; Flags: ignoreversion
Source: "requirements.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "iniciar.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "instalar_deps.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "static\*"; DestDir: "{app}\static"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "static\js\extensions\*"; DestDir: "{app}\static\js\extensions"; Flags: ignoreversion
Source: "templates\*"; DestDir: "{app}\templates"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\S+O Ultra Workspace"; Filename: "{app}\iniciar.bat"; WorkingDir: "{app}"; IconFilename: "{app}\static\favicon.ico"
Name: "{group}\Desinstalar S+O Ultra Workspace"; Filename: "{uninstallexe}"
Name: "{autodesktop}\S+O Ultra Workspace"; Filename: "{app}\iniciar.bat"; WorkingDir: "{app}"; Tasks: desktopicon; IconFilename: "{app}\static\favicon.ico"

[Run]
Filename: "{cmd}"; Parameters: "/C powershell -ExecutionPolicy Bypass -File ""{app}\instalar_deps.ps1"""; StatusMsg: "A configurar dependencias..."; Flags: waituntilterminated runhidden
Filename: "{app}\iniciar.bat"; Description: "Abrir S+O Ultra Workspace agora"; Flags: nowait postinstall skipifsilent

[Code]
function IsPythonInstalled: Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('cmd.exe', '/C python --version >nul 2>&1', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
  if not Result then
    Result := Exec('cmd.exe', '/C py --version >nul 2>&1', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
begin
  Result := '';
  if not IsPythonInstalled then
  begin
    if MsgBox('Python nao encontrado. O instalador vai descarregar e instalar Python 3.12.' + #13#10 + 'Isto pode demorar 1-2 minutos. Continuar?', mbConfirmation, MB_YESNO) = IDYES then
    begin
      Exec('powershell.exe', '-Command "Invoke-WebRequest -Uri ''https://www.python.org/ftp/python/3.12.9/python-3.12.9-amd64.exe'' -OutFile ''{tmp}\python_installer.exe''"', '', SW_SHOW, ewWaitUntilTerminated, ResultCode);
      Exec(ExpandConstant('{tmp}\python_installer.exe'), '/quiet InstallAllUsers=0 PrependPath=1 Include_pip=1', '', SW_SHOW, ewWaitUntilTerminated, ResultCode);
    end
    else
    begin
      Result := 'Python e necessario para o S+O Ultra Workspace funcionar.';
    end;
  end;
end;
