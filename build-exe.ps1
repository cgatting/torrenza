param(
  [string]$OutputName = "Torrenza.exe"
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $Root "frontend"
$BackendDir = Join-Path $Root "backend"
$ReleaseDir = Join-Path $Root "release"
$BackendDist = Join-Path $BackendDir "dist"
$FrontendDist = Join-Path $FrontendDir "dist"
$OutputPath = Join-Path $ReleaseDir $OutputName
$ServerOutputPath = Join-Path $ReleaseDir "Torrenza.Server.exe"
$LauncherSourcePath = Join-Path $ReleaseDir "TorrenzaLauncher.cs"

Write-Host "Building Torrenza frontend..."
Push-Location $FrontendDir
npm install
npm run build
Pop-Location

Write-Host "Preparing backend static frontend..."
if (Test-Path $BackendDist) {
  Remove-Item -LiteralPath $BackendDist -Recurse -Force
}
Copy-Item -LiteralPath $FrontendDist -Destination $BackendDist -Recurse

Write-Host "Installing backend dependencies..."
Push-Location $BackendDir
npm install
Pop-Location

Write-Host "Compiling server executable..."
if (!(Test-Path $ReleaseDir)) {
  New-Item -ItemType Directory -Path $ReleaseDir | Out-Null
}

Get-CimInstance Win32_Process |
  Where-Object { $_.ExecutablePath -eq $OutputPath -or $_.ExecutablePath -eq $ServerOutputPath } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

Push-Location $BackendDir
npx --yes @yao-pkg/pkg . --targets node22-win-x64 --output $ServerOutputPath
if ($LASTEXITCODE -ne 0) {
  throw "Failed to compile server executable."
}
Pop-Location

Write-Host "Compiling hidden GUI launcher..."
$launcherCode = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Threading;

public static class TorrenzaLauncher
{
    public static void Main()
    {
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        string serverPath = Path.Combine(baseDir, "Torrenza.Server.exe");
        string url = "http://127.0.0.1:5000/";

        if (!File.Exists(serverPath))
        {
            return;
        }

        if (!IsHealthy())
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = serverPath,
                WorkingDirectory = baseDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };

            Process.Start(startInfo);
        }

        for (int i = 0; i < 120; i++)
        {
            if (IsHealthy())
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
                return;
            }
            Thread.Sleep(500);
        }
    }

    private static bool IsHealthy()
    {
        try
        {
            using (var client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(1);
                var response = client.GetAsync("http://127.0.0.1:5000/health").GetAwaiter().GetResult();
                return response.IsSuccessStatusCode;
            }
        }
        catch
        {
            return false;
        }
    }
}
'@

Set-Content -Path $LauncherSourcePath -Value $launcherCode -Encoding ASCII
$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (!(Test-Path $csc)) {
  $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (!(Test-Path $csc)) {
  throw "Could not find csc.exe to compile the hidden launcher."
}
& $csc /nologo /target:winexe /out:$OutputPath /reference:System.Net.Http.dll $LauncherSourcePath
if ($LASTEXITCODE -ne 0) {
  throw "Failed to compile hidden launcher."
}
Remove-Item -LiteralPath $LauncherSourcePath -Force

Write-Host "Preparing release runtime folders..."
foreach ($folder in @("downloads", "data")) {
  $target = Join-Path $ReleaseDir $folder
  if (!(Test-Path $target)) {
    New-Item -ItemType Directory -Path $target | Out-Null
  }
}

$StopScript = Join-Path $Root "stop-torrenza.bat"
if (Test-Path $StopScript) {
  Copy-Item -LiteralPath $StopScript -Destination (Join-Path $ReleaseDir "stop-torrenza.bat") -Force
}

$BackendVenv = Join-Path $BackendDir ".venv"
$ReleaseVenv = Join-Path $ReleaseDir ".venv"
if (Test-Path $BackendVenv) {
  if (Test-Path $ReleaseVenv) {
    Remove-Item -LiteralPath $ReleaseVenv -Recurse -Force
  }
  Copy-Item -LiteralPath $BackendVenv -Destination $ReleaseVenv -Recurse
}

Write-Host ""
Write-Host "Build complete:"
Write-Host $OutputPath
Write-Host $ServerOutputPath
Write-Host ""
Write-Host "Run the exe from the release folder. It will serve the app and open the browser automatically."
