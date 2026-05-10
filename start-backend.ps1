Param(
    [string]$ListenHost = "127.0.0.1",
    [int]$Port = 8000
)

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $scriptPath "backend"
$pythonLocal = Join-Path $scriptPath "python-local\python.exe"

if (-not (Test-Path $backendPath)) {
    Write-Host "Backend folder not found at $backendPath" -ForegroundColor Red
    exit 1
}

if (Test-Path $pythonLocal) {
    $python = $pythonLocal
} else {
    # Fallback to system Python if local isn't available
    $python = "python"
}

# Set PYTHONPATH to include backend directory so Django can find config module
$env:PYTHONPATH = $backendPath

# Local development defaults. These override unrelated machine-level environment
# values such as DEBUG=release that Django cannot parse as booleans.
$env:DEBUG = "True"
if (-not $env:USE_SQLITE) {
    $env:USE_SQLITE = "True"
}

Set-Location $backendPath
Write-Host "Starting EstateMind backend using $python on $ListenHost`:$Port" -ForegroundColor Green
& $python -u manage.py runserver "$ListenHost`:$Port"
