$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Project = Join-Path $PSScriptRoot 'A220HotspotBridge\A220HotspotBridge.csproj'
$Manifest = Join-Path $PSScriptRoot 'A220HotspotBridge\Package.appxmanifest'
$Out = Join-Path $PSScriptRoot 'A220HotspotBridge\publish'
$Package = Join-Path $PSScriptRoot 'A220-WiFi-Transferencias.msix'
$CertPath = Join-Path $PSScriptRoot 'A220-LocalSigning.pfx'
$CertPassword = ConvertTo-SecureString ([Guid]::NewGuid().ToString('N')) -AsPlainText -Force

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) { throw 'Instalá .NET 8 SDK antes de continuar.' }
$SdkBin = Join-Path $env:ProgramFiles(x86) 'Windows Kits\10\bin'
$MakeAppx = Get-ChildItem $SdkBin -Filter MakeAppx.exe -Recurse | Where-Object FullName -Match '\\x64\\MakeAppx.exe$' | Sort-Object FullName -Descending | Select-Object -First 1
$SignTool = Get-ChildItem $SdkBin -Filter SignTool.exe -Recurse | Where-Object FullName -Match '\\x64\\SignTool.exe$' | Sort-Object FullName -Descending | Select-Object -First 1
if (-not $MakeAppx -or -not $SignTool) { throw 'Falta Windows 10/11 SDK (MakeAppx y SignTool). Instalá Windows SDK desde Visual Studio Installer.' }

if (Test-Path $Out) { Remove-Item $Out -Recurse -Force }
dotnet publish $Project -c Release -r win-x64 --self-contained true -o $Out
if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación del controlador.' }
Copy-Item $Manifest (Join-Path $Out 'AppxManifest.xml') -Force
$Assets = Join-Path $Out 'Assets'
New-Item -ItemType Directory -Force -Path $Assets | Out-Null
Add-Type -AssemblyName System.Drawing
foreach ($item in @(@('StoreLogo.png',50),@('Square150x150Logo.png',150),@('Square44x44Logo.png',44))) {
  $bmp = New-Object System.Drawing.Bitmap($item[1],$item[1])
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(15,23,42))
  $font = New-Object System.Drawing.Font('Arial',[Math]::Max(9,$item[1]/3),[System.Drawing.FontStyle]::Bold)
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248,65,65))
  $g.DrawString('A220',$font,$brush,(New-Object System.Drawing.PointF(2,$item[1]/3)))
  $bmp.Save((Join-Path $Assets $item[0]),[System.Drawing.Imaging.ImageFormat]::Png)
  $brush.Dispose(); $font.Dispose(); $g.Dispose(); $bmp.Dispose()
}
if (Test-Path $Package) { Remove-Item $Package -Force }
& $MakeAppx.FullName pack /d $Out /p $Package /o
if ($LASTEXITCODE -ne 0) { throw 'No se pudo empaquetar el controlador.' }
$cert = New-SelfSignedCertificate -Type Custom -Subject 'CN=A220 Local' -KeyUsage DigitalSignature -FriendlyName 'A220 Local Package Signing' -CertStoreLocation 'Cert:\CurrentUser\My' -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.3')
Export-PfxCertificate -Cert $cert -FilePath $CertPath -Password $CertPassword | Out-Null
& $SignTool.FullName sign /fd SHA256 /f $CertPath /p (ConvertFrom-SecureString $CertPassword -AsPlainText) $Package
if ($LASTEXITCODE -ne 0) { throw 'No se pudo firmar el paquete.' }
Export-Certificate -Cert $cert -FilePath (Join-Path $PSScriptRoot 'A220-LocalSigning.cer') | Out-Null
Import-Certificate -FilePath (Join-Path $PSScriptRoot 'A220-LocalSigning.cer') -CertStoreLocation 'Cert:\CurrentUser\TrustedPeople' | Out-Null
Add-AppxPackage -Path $Package
Write-Host 'Controlador instalado. Abrí “A220 Wi-Fi Transferencias” desde Inicio y vinculá el código que muestra la ventana.' -ForegroundColor Green
Write-Host 'No se modificó la versión publicada de A220.' -ForegroundColor Cyan
