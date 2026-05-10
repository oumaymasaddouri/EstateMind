# Start the React frontend development server

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendPath = Join-Path $scriptPath "frontend"

if (-not (Test-Path $frontendPath)) {
	Write-Host "Frontend folder not found at $frontendPath" -ForegroundColor Red
	exit 1
}

if (-not (Test-Path (Join-Path $frontendPath "package.json"))) {
	Write-Host "No package.json found in frontend folder." -ForegroundColor Red
	exit 1
}

function Get-CommandIfExists($names) {
	foreach ($n in $names) {
		$c = Get-Command $n -ErrorAction SilentlyContinue
		if ($c) { return $c.Source }
	}
	return $null
}

function Choose-PackageManager {
	Set-Location $frontendPath
	if (Test-Path (Join-Path $frontendPath "pnpm-lock.yaml")) {
		$cmd = Get-CommandIfExists @('pnpm.cmd','pnpm')
		if ($cmd) { return @{cmd=$cmd; args='start'} }
	}
	if (Test-Path (Join-Path $frontendPath "yarn.lock")) {
		$cmd = Get-CommandIfExists @('yarn.cmd','yarn')
		if ($cmd) { return @{cmd=$cmd; args='start'} }
	}
	$cmd = Get-CommandIfExists @('npm.cmd','npm')
	if ($cmd) { return @{cmd=$cmd; args='start'} }
	return $null
}

$pm = Choose-PackageManager
if (-not $pm) {
	Write-Host "No Node package manager found (npm/pnpm/yarn). Install Node.js and a package manager or add it to PATH." -ForegroundColor Red
	exit 1
}

# Ensure node directory (if we found a .cmd) is on PATH so node can be located
$pmDir = Split-Path -Parent $pm.cmd
if ($pmDir -and (Test-Path (Join-Path $pmDir "node.exe"))) {
	$env:Path = "$pmDir;$env:Path"
}

if (-not $env:BROWSER) {
	$env:BROWSER = "none"
}

Write-Host "Starting EstateMind Frontend (using $($pm.cmd))..." -ForegroundColor Green
Set-Location $frontendPath
& $pm.cmd $pm.args
