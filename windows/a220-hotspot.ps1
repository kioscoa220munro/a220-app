# A220 Wi-Fi Transferencias - controlador local Windows 10
# Solo escucha en 127.0.0.1. No expone un puerto a la red local ni a Internet.
$ErrorActionPreference = 'Stop'
$Port = 8765
$Ssid = 'A220_TRANSFERENCIAS'
$IdleSeconds = 120
$DataDir = Join-Path $env:LOCALAPPDATA 'A220Hotspot'
New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
$TokenPath = Join-Path $DataDir 'token.txt'
$PasswordPath = Join-Path $DataDir 'wifi-password.txt'
if (!(Test-Path $TokenPath)) {
  $bytes = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [Convert]::ToBase64String($bytes) | Set-Content -Encoding ASCII $TokenPath
}
if (!(Test-Path $PasswordPath)) {
  $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#'
  $randomBytes = New-Object byte[] 22
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($randomBytes)
  $generatedPassword = -join ($randomBytes | ForEach-Object { $alphabet[$_ % $alphabet.Length] })
  $generatedPassword | Set-Content -Encoding ASCII $PasswordPath
}
$Token = (Get-Content $TokenPath -Raw).Trim()
$WifiPassword = (Get-Content $PasswordPath -Raw).Trim()
Write-Host ''
Write-Host 'A220 WI-FI TRANSFERENCIAS' -ForegroundColor Cyan
Write-Host 'Código para vincular A220:' -ForegroundColor Yellow
Write-Host $Token -ForegroundColor Green
Write-Host 'Clave Wi-Fi generada (también aparece en el panel A220):' -ForegroundColor Yellow
Write-Host $WifiPassword -ForegroundColor Green
Write-Host ''
Write-Host 'No cierres esta ventana mientras quieras controlar el hotspot.' -ForegroundColor DarkGray

$script:LastClientSeen = Get-Date
$script:LastError = $null
$script:InternetSharing = $false

function Invoke-Netsh([string[]]$Arguments) {
  $output = & netsh.exe @Arguments 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { throw ($output.Trim()) }
  return $output
}
function Test-HostedNetworkSupport {
  $output = Invoke-Netsh @('wlan','show','drivers')
  return ($output -match '(?im)Hosted network supported\s*:\s*Yes' -or $output -match '(?im)(Red hospedada admitida|Compatibilidad con red hospedada)\s*:\s*S[ií]')
}
function Get-HostedNetworkInfo {
  $output = Invoke-Netsh @('wlan','show','hostednetwork')
  $started = $output -match '(?im)^\s*(Status|Estado)\s*:\s*(Started|Iniciado|Iniciada)\s*$'
  $clientMatch = [regex]::Match($output,'(?im)(Number of clients|Número de clientes)\s*:\s*(\d+)')
  if ($clientMatch.Success) {
    $clientCount = [int]$clientMatch.Groups[2].Value
  } else {
    $macs = [regex]::Matches($output,'(?im)^\s*([0-9a-f]{2}(?:[:-][0-9a-f]{2}){5})\s*$')
    $clientCount = $macs.Count
  }
  return @{ enabled = [bool]$started; clients = $clientCount; raw = $output }
}
function Enable-InternetSharing {
  try {
    $manager = New-Object -ComObject HNetCfg.HNetShare
    $connections = @($manager.EnumEveryConnection)
    $publicConnection = $null
    $privateConnection = $null
    foreach ($connection in $connections) {
      $props = $manager.NetConnectionProps.Invoke($connection)
      if ($props.DeviceName -match '(?i)wi-?fi|wireless|wlan' -and $props.Status -eq 2) { $publicConnection = $connection }
      if ($props.DeviceName -match '(?i)hosted network|red hospedada|local area connection\*') { $privateConnection = $connection }
    }
    if (!$publicConnection -or !$privateConnection) { throw 'Windows no pudo identificar la conexión Wi-Fi y el adaptador virtual del hotspot para compartir Internet.' }
    $publicConfig = $manager.INetSharingConfigurationForINetConnection.Invoke($publicConnection)
    $privateConfig = $manager.INetSharingConfigurationForINetConnection.Invoke($privateConnection)
    if (!$publicConfig.SharingEnabled) { $publicConfig.EnableSharing(0) }
    if (!$privateConfig.SharingEnabled) { $privateConfig.EnableSharing(1) }
    $script:InternetSharing = $true
  } catch {
    $script:InternetSharing = $false
    $script:LastError = 'Hotspot activo, pero no se pudo confirmar el uso compartido de Internet: ' + $_.Exception.Message
  }
}
function Stop-A220Hotspot {
  try { Invoke-Netsh @('wlan','stop','hostednetwork') | Out-Null } catch { $script:LastError = $_.Exception.Message }
  $script:InternetSharing = $false
}
function Get-A220Status {
  $supported = Test-HostedNetworkSupport
  if (!$supported) { return @{ ok=$true; supported=$false; enabled=$false; clients=0; secondsRemaining=0; internetSharing=$false; error='El controlador Wi-Fi no admite la función Red hospedada de Windows (Hosted Network).' } }
  $info = Get-HostedNetworkInfo
  if ($info.enabled -and $info.clients -gt 0) { $script:LastClientSeen = Get-Date }
  $remaining = if ($info.enabled -and $info.clients -eq 0) { [Math]::Max(0,$IdleSeconds - [int]((Get-Date)-$script:LastClientSeen).TotalSeconds) } else { 0 }
  if ($info.enabled -and $info.clients -eq 0 -and $remaining -le 0) {
    Stop-A220Hotspot
    $info = Get-HostedNetworkInfo
  }
  return @{ ok=$true; supported=$true; enabled=[bool]$info.enabled; clients=[int]$info.clients; secondsRemaining=$remaining; internetSharing=[bool]$script:InternetSharing; ssid=$Ssid; password=$WifiPassword; error=$script:LastError }
}
function Send-Json($Context, $Object, [int]$StatusCode = 200) {
  $json = $Object | ConvertTo-Json -Depth 6 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $Context.Response.StatusCode = $StatusCode
  $Context.Response.ContentType = 'application/json; charset=utf-8'
  $Context.Response.Headers['Access-Control-Allow-Origin'] = '*'
  $Context.Response.Headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  $Context.Response.Headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
  $Context.Response.Headers['Access-Control-Allow-Private-Network'] = 'true'
  $Context.Response.ContentLength64 = $bytes.Length
  $Context.Response.OutputStream.Write($bytes,0,$bytes.Length)
  $Context.Response.Close()
}
$listener = New-Object Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
try {
  $listener.Start()
  Write-Host "Controlador escuchando en http://127.0.0.1:$Port/" -ForegroundColor Cyan
  while ($listener.IsListening) {
    # El timeout mantiene el apagado automático aunque se cierre la página.
    $task = $listener.GetContextAsync()
    if (!$task.Wait(1000)) {
      try { $null = Get-A220Status } catch { $script:LastError = $_.Exception.Message }
      continue
    }
    $context = $task.Result
    $request = $context.Request
    if ($request.HttpMethod -eq 'OPTIONS') { Send-Json $context @{ok=$true}; continue }
    $auth = $request.Headers['Authorization']
    if (!$auth -or $auth -cne ('Bearer ' + $Token)) { Send-Json $context @{ok=$false;error='Código de conexión inválido.'} 401; continue }
    try {
      switch ($request.Url.AbsolutePath) {
        '/status' { $result = Get-A220Status; Send-Json $context $result }
        '/start' {
          if (!(Test-HostedNetworkSupport)) { throw 'Este adaptador Wi-Fi no admite Red hospedada.' }
          Invoke-Netsh @('wlan','set','hostednetwork','mode=allow',"ssid=$Ssid","key=$WifiPassword") | Out-Null
          Invoke-Netsh @('wlan','start','hostednetwork') | Out-Null
          $script:LastClientSeen = Get-Date
          Start-Sleep -Seconds 2
          Enable-InternetSharing
          Send-Json $context (Get-A220Status)
        }
        '/stop' { Stop-A220Hotspot; Send-Json $context (Get-A220Status) }
        default { Send-Json $context @{ok=$false;error='Ruta no encontrada.'} 404 }
      }
    } catch { $script:LastError = $_.Exception.Message; Send-Json $context @{ok=$false;error=$script:LastError} 500 }
  }
} finally {
  if ($listener.IsListening) { $listener.Stop() }
  $listener.Close()
}
