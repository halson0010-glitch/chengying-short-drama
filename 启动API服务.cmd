@echo off
setlocal
cd /d "%~dp0"
title Chengying API Launcher

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local-service.ps1" -Service api %*

if errorlevel 1 (
  echo.
  echo Failed to start Chengying API.
  echo Please run npm install, npm run db:push and npm run db:seed, then retry.
  echo.
  pause
)

endlocal
