[CmdletBinding()]
param(
  [int]$StartPort = 5173,
  [switch]$NoBrowser,
  [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
$webDistPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\apps\web\dist'))
$legacyDistPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\dist'))
$distPath = if (Test-Path -LiteralPath (Join-Path $webDistPath 'index.html') -PathType Leaf) {
  $webDistPath
} else {
  $legacyDistPath
}
$indexPath = Join-Path $distPath 'index.html'

if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
  Write-Host 'Missing dist\index.html.' -ForegroundColor Red
  Write-Host 'Ask the project maintainer to run npm install and npm run build before sharing this folder.'
  exit 1
}

function Get-FreeLocalPort {
  param([int]$FirstPort)

  for ($port = $FirstPort; $port -lt ($FirstPort + 100); $port++) {
    if ($port -in @(4000, 5174)) {
      continue
    }

    $probe = $null
    try {
      $probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
      $probe.Start()
      return $port
    }
    catch {
      continue
    }
    finally {
      if ($null -ne $probe) {
        $probe.Stop()
      }
    }
  }

  throw 'No free local port was found.'
}

function Write-Response {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [string]$Method,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body
  )

  $header = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)

  if ($Method -ne 'HEAD' -and $Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

$contentTypes = @{
  '.html' = 'text/html; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg' = 'image/svg+xml'
  '.png' = 'image/png'
  '.jpg' = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'
  '.ico' = 'image/x-icon'
  '.woff2' = 'font/woff2'
}

$port = Get-FreeLocalPort -FirstPort $StartPort
$url = "http://localhost:$port/"
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()

Write-Host ''
Write-Host 'Chengying Short Drama is ready.' -ForegroundColor Green
Write-Host "Open: $url" -ForegroundColor Cyan
Write-Host 'Keep this window open while browsing. Press Ctrl+C to stop.'
Write-Host ''

if (-not $NoBrowser) {
  Start-Process $url
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()

    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()

      while ($null -ne ($line = $reader.ReadLine()) -and $line.Length -gt 0) {
        # Read and discard headers before responding.
      }

      if ($requestLine -notmatch '^(GET|HEAD) ([^ ]+) HTTP/') {
        $message = [System.Text.Encoding]::UTF8.GetBytes('Method not allowed')
        Write-Response -Stream $stream -Method 'GET' -StatusCode 405 -StatusText 'Method Not Allowed' -ContentType 'text/plain; charset=utf-8' -Body $message
        continue
      }

      $method = $Matches[1]
      $requestTarget = $Matches[2]
      $rawPath = $requestTarget.Split('?')[0]
      $relativePath = [System.Uri]::UnescapeDataString($rawPath).TrimStart('/')
      if ($relativePath.StartsWith('chengying-short-drama/', [System.StringComparison]::OrdinalIgnoreCase)) {
        $relativePath = $relativePath.Substring('chengying-short-drama/'.Length)
      }

      if ([string]::IsNullOrWhiteSpace($relativePath)) {
        $filePath = $indexPath
      }
      else {
        $localPath = $relativePath -replace '/', [System.IO.Path]::DirectorySeparatorChar
        $candidate = [System.IO.Path]::GetFullPath((Join-Path $distPath $localPath))
        $distPrefix = $distPath.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar

        if (-not $candidate.StartsWith($distPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
          $message = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
          Write-Response -Stream $stream -Method $method -StatusCode 403 -StatusText 'Forbidden' -ContentType 'text/plain; charset=utf-8' -Body $message
          continue
        }

        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
          $filePath = $candidate
        }
        elseif ([string]::IsNullOrEmpty([System.IO.Path]::GetExtension($candidate))) {
          $filePath = $indexPath
        }
        else {
          $message = [System.Text.Encoding]::UTF8.GetBytes('Not found')
          Write-Response -Stream $stream -Method $method -StatusCode 404 -StatusText 'Not Found' -ContentType 'text/plain; charset=utf-8' -Body $message
          continue
        }
      }

      $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
      $contentType = if ($contentTypes.ContainsKey($extension)) { $contentTypes[$extension] } else { 'application/octet-stream' }
      $body = [System.IO.File]::ReadAllBytes($filePath)
      Write-Response -Stream $stream -Method $method -StatusCode 200 -StatusText 'OK' -ContentType $contentType -Body $body
    }
    catch {
      Write-Host "Request failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    finally {
      $client.Close()
    }
  }
}
finally {
  $listener.Stop()
}
