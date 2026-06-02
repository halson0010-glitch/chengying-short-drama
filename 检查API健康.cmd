@echo off
setlocal
cd /d "%~dp0"
title Chengying API Health Check

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local-service.ps1" -Service health %*

if errorlevel 1 (
  echo.
  echo Failed to check Chengying API health.
  echo.
  pause
)

endlocal
