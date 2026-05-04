$ErrorActionPreference = "Stop"

$candidates = @()

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCmd) {
    $candidates += $pythonCmd.Source
}

$pyCmd = Get-Command py -ErrorAction SilentlyContinue
if ($pyCmd) {
    $candidates += $pyCmd.Source
}

$common = @(
    "C:\Users\QscUser\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
    "$env:LOCALAPPDATA\Microsoft\WindowsApps\python.exe"
)

foreach ($path in $common) {
    try {
        if (Test-Path $path) {
            $candidates += $path
        }
    }
    catch {
        continue
    }
}

$python = $candidates | Select-Object -Unique | Select-Object -First 1

if (-not $python) {
    Write-Host "No Python executable was found."
    Write-Host "Install Python 3.11+ or add python.exe to PATH, then run this script again."
    exit 1
}

Write-Host "Starting Tunisia Platform with $python"
& $python "app.py"
