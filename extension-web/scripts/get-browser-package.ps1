$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$packagesRoot = Join-Path $root "dist-packages"

function Assert-Command($name, $installHint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "$name is required. $installHint"
  }
}

function Read-BrowserChoice {
  Write-Host ""
  Write-Host "Choose your browser:" -ForegroundColor Cyan
  Write-Host "1) Chrome"
  Write-Host "2) Brave"
  Write-Host "3) Edge"
  Write-Host "4) Firefox"
  Write-Host ""

  while ($true) {
    $choice = Read-Host "Enter 1, 2, 3, or 4"
    switch ($choice.Trim()) {
      "1" { return "chrome" }
      "2" { return "brave" }
      "3" { return "edge" }
      "4" { return "firefox" }
      default { Write-Host "Please enter 1, 2, 3, or 4." -ForegroundColor Yellow }
    }
  }
}

Assert-Command "node" "Install Node.js from https://nodejs.org/ and run this command again."
Assert-Command "npm" "Install Node.js from https://nodejs.org/ and run this command again."

$browser = Read-BrowserChoice

Push-Location $root
try {
  if (-not (Test-Path (Join-Path $root "node_modules"))) {
    Write-Host "Installing extension dependencies..." -ForegroundColor Cyan
    npm ci
  }

  Write-Host "Building LookMeNot extension..." -ForegroundColor Cyan
  npm run build

  if ($browser -eq "firefox") {
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "scripts/package-firefox.ps1")
    $outputDir = Join-Path $packagesRoot "firefox"
  } else {
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "scripts/package-extension.ps1") -Browser $browser
    $outputDir = Join-Path $packagesRoot $browser
  }

  Write-Host ""
  Write-Host "Done. Your package is here:" -ForegroundColor Green
  Write-Host $outputDir
  Write-Host ""
  Write-Host "Open INSTALL.txt in that folder for browser-specific steps."

  if ($IsWindows -or $env:OS -eq "Windows_NT") {
    Invoke-Item $outputDir
  }
} finally {
  Pop-Location
}