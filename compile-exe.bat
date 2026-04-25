@echo off
setlocal
cd /d "%~dp0"
set TORRENZA_OPEN_BROWSER=1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-exe.ps1"
endlocal
