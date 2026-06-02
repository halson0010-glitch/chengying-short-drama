@echo off
setlocal
cd /d "%~dp0"
title Chengying Full Stack Launcher

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local-service.ps1" -Service all %*

if errorlevel 1 (
  echo.
  echo Failed to start Chengying full stack services.
  echo Please run npm install, npm run db:push and npm run db:seed, then retry.
  echo.
  pause
)

endlocal
