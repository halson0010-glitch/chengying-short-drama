@echo off
setlocal
cd /d "%~dp0"
title Chengying Short Drama - Local Preview

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\serve-local-preview.ps1" %*

if errorlevel 1 (
  echo.
  echo The local preview could not be started.
  echo Please keep the dist folder when sharing this project.
  echo If dist is missing, run npm install and npm run build first.
  echo.
  pause
)

endlocal
