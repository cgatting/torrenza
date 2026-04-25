@echo off
setlocal
cd /d "%~dp0"

set "BACKEND_URL=http://127.0.0.1:5000/health"
set "FRONTEND_URL=http://127.0.0.1:5173/"
set "MAX_TRIES=120"
set "USE_POWERSHELL_CHECK=0"

where curl.exe >nul 2>nul
if errorlevel 1 set "USE_POWERSHELL_CHECK=1"

echo Clearing old Torrenza processes on ports 5000 and 5173...
powershell -NoProfile -ExecutionPolicy Bypass -Command "foreach($port in 5000,5173){ Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object { $p = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $_.OwningProcess) -ErrorAction SilentlyContinue; if($p -and ($p.Name -eq 'node.exe' -or $p.CommandLine -like '*torrenza*')){ Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } }"
ping -n 2 127.0.0.1 >nul

for %%P in (5000 5173) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "if(Get-NetTCPConnection -State Listen -LocalPort %%P -ErrorAction SilentlyContinue){ exit 1 }"
  if errorlevel 1 (
    echo Port %%P is already in use by another process.
    echo Close the process using port %%P, then run start.bat again.
    goto done
  )
)

echo Starting Torrenza Backend...
start "Torrenza Backend" cmd /k "cd /d ""%~dp0backend"" && npm run start"

echo Starting Torrenza Frontend...
start "Torrenza Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"

echo Waiting for services to become ready...
set /a tries=0

:wait_loop
set /a tries+=1
if %tries% gtr %MAX_TRIES% goto timeout

if "%USE_POWERSHELL_CHECK%"=="0" (
  curl.exe --silent --show-error --max-time 2 --output NUL "%BACKEND_URL%"
  if errorlevel 1 (
    ping -n 2 127.0.0.1 >nul
    goto wait_loop
  )

  curl.exe --silent --show-error --max-time 2 --output NUL "%FRONTEND_URL%"
  if errorlevel 1 (
    ping -n 2 127.0.0.1 >nul
    goto wait_loop
  )
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { (Invoke-WebRequest -UseBasicParsing '%BACKEND_URL%' -TimeoutSec 2) | Out-Null; exit 0 } catch { exit 1 }"
  if errorlevel 1 (
    ping -n 2 127.0.0.1 >nul
    goto wait_loop
  )

  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { (Invoke-WebRequest -UseBasicParsing '%FRONTEND_URL%' -TimeoutSec 2) | Out-Null; exit 0 } catch { exit 1 }"
  if errorlevel 1 (
    ping -n 2 127.0.0.1 >nul
    goto wait_loop
  )
)

echo Services ready. Opening Torrenza in browser...
start "" "%FRONTEND_URL%"
echo Backend: %BACKEND_URL%
echo Frontend: %FRONTEND_URL%
goto done

:timeout
echo Timed out waiting for Torrenza to start.
echo Check backend/frontend terminal windows for errors.

:done
endlocal
