<#
.SYNOPSIS
  Start development environment from PowerShell (works with WSL + Docker Desktop).

.DESCRIPTION
  This wrapper runs the backend `docker-compose` inside WSL (so Docker Desktop WSL
  integration is used), and can optionally start the frontend dev server inside WSL.

  Usage:
    .\start-dev.ps1            # start backend compose only
    .\start-dev.ps1 -Frontend  # also install and start frontend (background)
    .\start-dev.ps1 -ForegroundFrontend  # start frontend interactively (foreground)
#>

param(
    [switch]$Frontend,
    [switch]$ForegroundFrontend
)

function Write-Err($s){ Write-Host $s -ForegroundColor Red }
function Write-Ok($s){ Write-Host $s -ForegroundColor Green }

# Determine script root (project root)
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Host "Project root: $root"

# Convert Windows path to WSL path using `wsl wslpath` if available
$wslRoot = ""
try {
    $wslRoot = (wsl wslpath -a "$root" 2>$null).Trim()
} catch {
    # ignore
}
if ([string]::IsNullOrWhiteSpace($wslRoot)) {
    # fallback conversion: remove leading backslash from remainder to avoid double-slash
    $drive = $root.Substring(0,1).ToLower()
    $pathRest = $root.Substring(2) -replace '\\','/'
    $pathRest = $pathRest.TrimStart('/')
    $wslRoot = "/mnt/$drive/$pathRest"
}
Write-Host "WSL path: $wslRoot"

# Ensure WSL & Docker are available
Write-Host "Checking Docker availability inside WSL..."
# Use a robust check: echo OK or NOK from WSL and parse output
$check = (wsl bash -lc "docker info >/dev/null 2>&1 && echo OK || echo NOK" 2>$null).ToString().Trim()
if ($check -ne 'OK') {
    Write-Err "Docker does not appear to be available inside WSL. Start Docker Desktop and enable WSL integration."
    exit 1
}

# Find docker-compose file to use
$composeFileWin = Join-Path $root 'backend\docker-compose.yml'
$composeFileWsl = "$wslRoot/backend/docker-compose.yml"
if (Test-Path $composeFileWin) {
    Write-Host "Using compose file: backend/docker-compose.yml"
    $composeArg = "-f backend/docker-compose.yml"
} else {
    Write-Host "backend/docker-compose.yml not found in project root; searching for any docker-compose file..."
    $found = wsl bash -lc "find '$wslRoot' -maxdepth 4 -type f -iname 'docker-compose*.yml' -o -iname 'docker-compose*.yaml' -print | head -n 1" | Out-String
    $found = $found.Trim()
    if ($found) {
        Write-Host "Found compose file: $found"
        # convert to relative path from project root if inside it
        if ($found.StartsWith($wslRoot)) {
            $rel = $found.Substring($wslRoot.Length).TrimStart('/') -replace '/','/'
            $composeArg = "-f $rel"
        } else {
            $composeArg = "-f $found"
        }
    } else {
        Write-Err "No docker-compose file found under project. Cannot start backend."
        exit 1
    }
}

# Start backend (detached)
Write-Host "Starting backend via docker-compose ($composeArg)..."
wsl bash -lc "cd '$wslRoot' && docker-compose $composeArg up -d"
if ($LASTEXITCODE -ne 0) {
    Write-Err "docker-compose failed"
    exit 1
}
Write-Ok "Backend services started."

# Optionally start frontend inside WSL
if ($Frontend -or $ForegroundFrontend) {
    $frontendDir = "$wslRoot/frontend"
    Write-Host "Preparing frontend in WSL: $frontendDir"
    if ($ForegroundFrontend) {
        Write-Host "Starting frontend interactively (foreground). Press Ctrl+C to stop."
        wsl bash -lc "cd '$frontendDir' && npm install --no-audit --no-fund && npm run dev"
    } else {
        Write-Host "Installing and starting frontend in background (logs -> /tmp/frontend.log)."
        wsl bash -lc "cd '$frontendDir' && npm install --no-audit --no-fund && nohup npm run dev > /tmp/frontend.log 2>&1 &"
        Write-Ok "Frontend started in background; check /tmp/frontend.log inside WSL for logs."
    }
}

Write-Ok "Done."
