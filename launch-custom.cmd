@echo off
setlocal
cd /d "%~dp0"
node tools\launch-custom.mjs
if errorlevel 1 (
  echo.
  echo Launch failed. See the error above.
  pause
  exit /b 1
)
