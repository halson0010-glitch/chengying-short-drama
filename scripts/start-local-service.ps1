[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('api', 'admin', 'health', 'all')]
  [string]$Service,

  [switch]$NoBrowser,
  [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

function Find-Node {
  $candidates = @()

  $bundled = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
  if (Test-Path -LiteralPath $bundled -PathType Leaf) {
    $candidates += $bundled
  }

  $node = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($node -and $node.Source -and ($candidates -notcontains $node.Source)) {
    $candidates += $node.Source
  }

  foreach ($candidate in $candidates) {
    try {
      $version = & $candidate --version 2>$null
      if ($LASTEXITCODE -eq 0 -and $version) {
        return $candidate
      }
    }
    catch {
      continue
    }
  }

  throw 'Node.js was not found. Please install Node.js 18+ and run npm install.'
}

function Get-NpmCli {
  param([string]$NodePath)

  if ($env:npm_execpath -and (Test-Path -LiteralPath $env:npm_execpath -PathType Leaf)) {
    return $env:npm_execpath
  }

  $codexNpm = Join-Path $env:LOCALAPPDATA 'CodexTools\npm-cli-10.9.2\package\bin\npm-cli.js'
  if (Test-Path -LiteralPath $codexNpm -PathType Leaf) {
    return $codexNpm
  }

  $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($npmCmd) {
    return $npmCmd.Source
  }

  $nodeDir = Split-Path -Parent $NodePath
  $nearbyNpm = Join-Path $nodeDir 'node_modules\npm\bin\npm-cli.js'
  if (Test-Path -LiteralPath $nearbyNpm -PathType Leaf) {
    return $nearbyNpm
  }

  throw 'npm was not found. Please install Node.js with npm.'
}

function Invoke-Npm {
  param(
    [string]$Script,
    [string[]]$ExtraArgs = @()
  )

  if ($script:npmCli.EndsWith('.cmd', [System.StringComparison]::OrdinalIgnoreCase)) {
    $arguments = @($Script) + $ExtraArgs
    & $script:npmCli @arguments
  }
  else {
    $arguments = @($script:npmCli, $Script) + $ExtraArgs
    & $script:node @arguments
  }

  if ($LASTEXITCODE -ne 0) {
    throw "npm command failed: $Script $($ExtraArgs -join ' ')"
  }
}

function Get-Listener {
  param([int]$Port)
  Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
}

function Get-ListenerProcesses {
  param([int]$Port)

  Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($_.OwningProcess)" -ErrorAction SilentlyContinue
    [PSCustomObject]@{
      ProcessId = $_.OwningProcess
      Name = $process.Name
      CommandLine = $process.CommandLine
    }
  }
}

function Stop-LocalPreviewOnPort {
  param([int]$Port)

  $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($listener in $listeners) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue
    if ($process.CommandLine -like '*serve-local-preview.ps1*') {
      Write-Host "Stopping local H5 preview on port $Port so the admin service can use it..." -ForegroundColor Yellow
      Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
}

function Wait-ForHttp {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 30,
    [string]$ExpectedText = ''
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        if (-not $ExpectedText -or $response.Content.Contains($ExpectedText)) {
          return $true
        }
      }
    }
    catch {
      Start-Sleep -Milliseconds 700
    }
  } while ((Get-Date) -lt $deadline)

  return $false
}

function Stop-ConflictingLocalServiceOnPort {
  param(
    [int]$Port,
    [string]$Name,
    [string]$ReadyUrl,
    [string]$ExpectedText
  )

  if (Wait-ForHttp -Url $ReadyUrl -TimeoutSeconds 2 -ExpectedText $ExpectedText) {
    return
  }

  $listeners = @(Get-ListenerProcesses -Port $Port)
  foreach ($listener in $listeners) {
    $commandLine = [string]$listener.CommandLine
    $isProjectLocalService =
      $commandLine -like "*$root*" -and (
        $commandLine -like '*vite*' -or
        $commandLine -like '*serve-local-preview.ps1*' -or
        $commandLine -like '*run-workspace.mjs*'
      )

    if ($isProjectLocalService) {
      Write-Host "Stopping conflicting local service on port $Port before starting $Name..." -ForegroundColor Yellow
      Stop-Process -Id $listener.ProcessId -Force -ErrorAction SilentlyContinue
    }
  }
}

function Start-WorkspaceService {
  param(
    [string]$Workspace,
    [string]$Name,
    [int]$Port,
    [string]$ReadyUrl,
    [string]$ExpectedText = ''
  )

  $existing = Get-Listener -Port $Port
  if ($Workspace -eq '@chengying/admin' -and $existing) {
    Stop-LocalPreviewOnPort -Port $Port
    Stop-ConflictingLocalServiceOnPort -Port $Port -Name $Name -ReadyUrl $ReadyUrl -ExpectedText $ExpectedText
    Start-Sleep -Milliseconds 500
    $existing = Get-Listener -Port $Port
  }

  if ($existing) {
    if (Wait-ForHttp -Url $ReadyUrl -TimeoutSeconds 3 -ExpectedText $ExpectedText) {
      Write-Host "$Name is already running on port $Port." -ForegroundColor Yellow
      return
    }

    $listeners = @(Get-ListenerProcesses -Port $Port)
    $details = ($listeners | ForEach-Object { "PID $($_.ProcessId) $($_.Name)" }) -join ', '
    throw "$Name cannot start because port $Port is occupied by another service ($details). Close it and retry."
  }

  Write-Host "Starting $Name..." -ForegroundColor Cyan
  $nodeDir = Split-Path -Parent $script:node
  $devCommand = if ($script:npmCli.EndsWith('.cmd', [System.StringComparison]::OrdinalIgnoreCase)) {
    "`"$script:npmCli`" run dev -w $Workspace"
  }
  else {
    "`"$script:node`" `"$script:npmCli`" run dev -w $Workspace"
  }

  $command = "title $Name && cd /d `"$root`" && set `"PATH=$nodeDir;%PATH%`" && $devCommand"
  Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', $command) -WorkingDirectory $root -WindowStyle Minimized | Out-Null
  if (-not (Wait-ForHttp -Url $ReadyUrl -TimeoutSeconds 45 -ExpectedText $ExpectedText)) {
    throw "$Name did not become ready at $ReadyUrl."
  }
  Write-Host "$Name is ready: $ReadyUrl" -ForegroundColor Green
}

function Ensure-Dependencies {
  if (-not (Test-Path -LiteralPath (Join-Path $root 'node_modules') -PathType Container)) {
    Write-Host 'Installing dependencies...' -ForegroundColor Cyan
    Push-Location $root
    try {
      Invoke-Npm 'install'
    }
    finally {
      Pop-Location
    }
  }
}

function Ensure-Database {
  $possibleDbs = @(
    (Join-Path $root 'apps\api\prisma\dev.db'),
    (Join-Path $root 'apps\api\dev.db')
  )
  $hasDatabase = $possibleDbs | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
  if ($hasDatabase) {
    if (Get-Listener -Port 4000) {
      Write-Host 'SQLite schema sync skipped because API is already running.' -ForegroundColor Yellow
      return
    }

    Write-Host 'Syncing SQLite schema...' -ForegroundColor Cyan
    Push-Location $root
    try {
      Invoke-Npm 'run' @('db:push')
    }
    finally {
      Pop-Location
    }
  }
  else {
    Write-Host 'Initializing SQLite database...' -ForegroundColor Cyan
    Push-Location $root
    try {
      Invoke-Npm 'run' @('db:push')
      Invoke-Npm 'run' @('db:seed')
    }
    finally {
      Pop-Location
    }
  }
}

$script:node = Find-Node
$script:npmCli = Get-NpmCli -NodePath $script:node
$env:Path = (Split-Path -Parent $script:node) + ';' + $env:Path

try {
  Push-Location $root
  Ensure-Dependencies
  Ensure-Database

  switch ($Service) {
    'api' {
      Start-WorkspaceService -Workspace '@chengying/api' -Name 'Chengying API' -Port 4000 -ReadyUrl 'http://localhost:4000/health'
      if (-not $NoBrowser) {
        Start-Process 'http://localhost:4000/health'
      }
      Write-Host ''
      Write-Host 'API: http://localhost:4000/' -ForegroundColor Cyan
      Write-Host 'Health: http://localhost:4000/health' -ForegroundColor Cyan
    }
    'admin' {
      Start-WorkspaceService -Workspace '@chengying/api' -Name 'Chengying API' -Port 4000 -ReadyUrl 'http://localhost:4000/health'
      Start-WorkspaceService -Workspace '@chengying/admin' -Name 'Chengying Admin' -Port 5174 -ReadyUrl 'http://localhost:5174/' -ExpectedText 'name="chengying-app" content="admin"'
      if (-not $NoBrowser) {
        Start-Process 'http://localhost:5174/'
      }
      Write-Host ''
      Write-Host 'Admin: http://localhost:5174/' -ForegroundColor Cyan
      Write-Host 'Login: admin / admin123' -ForegroundColor Cyan
    }
    'health' {
      Start-WorkspaceService -Workspace '@chengying/api' -Name 'Chengying API' -Port 4000 -ReadyUrl 'http://localhost:4000/health'
      $health = Invoke-RestMethod -Uri 'http://localhost:4000/health'
      Write-Host ''
      Write-Host "API health: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
      if (-not $NoBrowser) {
        Start-Process 'http://localhost:4000/health'
      }
    }
    'all' {
      Start-WorkspaceService -Workspace '@chengying/api' -Name 'Chengying API' -Port 4000 -ReadyUrl 'http://localhost:4000/health'
      Start-WorkspaceService -Workspace '@chengying/web' -Name 'Chengying H5' -Port 5173 -ReadyUrl 'http://localhost:5173/'
      Start-WorkspaceService -Workspace '@chengying/admin' -Name 'Chengying Admin' -Port 5174 -ReadyUrl 'http://localhost:5174/' -ExpectedText 'name="chengying-app" content="admin"'
      if (-not $NoBrowser) {
        Start-Process 'http://localhost:5173/'
        Start-Process 'http://localhost:5174/'
        Start-Process 'http://localhost:4000/health'
      }
      Write-Host ''
      Write-Host 'H5: http://localhost:5173/' -ForegroundColor Cyan
      Write-Host 'Admin: http://localhost:5174/' -ForegroundColor Cyan
      Write-Host 'API: http://localhost:4000/' -ForegroundColor Cyan
      Write-Host 'Health: http://localhost:4000/health' -ForegroundColor Cyan
      Write-Host 'Admin login: admin / admin123' -ForegroundColor Cyan
    }
  }

  Write-Host ''
  Write-Host 'Keep the service terminal windows open while using the site. Close those windows or press Ctrl+C inside them to stop services.' -ForegroundColor DarkGray
}
catch {
  Write-Host ''
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
finally {
  Pop-Location
}

if (-not $NoPause) {
  Write-Host ''
  Read-Host 'Press Enter to close this launcher window'
}
