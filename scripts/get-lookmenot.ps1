$ErrorActionPreference = "Stop"

$repoZipUrl = "https://github.com/SunilKumarPradhan/LookMeNot/archive/refs/heads/main.zip"
$baseDir = if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA "LookMeNot" } else { Join-Path $env:TEMP "LookMeNot" }
$zipPath = Join-Path $baseDir "LookMeNot-main.zip"
$sourceDir = Join-Path $baseDir "LookMeNot-main"
$extensionDir = Join-Path $sourceDir "extension-web"
$pickerScript = Join-Path $extensionDir "scripts/get-browser-package.ps1"

function Assert-Command($name, $installHint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "$name is required. $installHint"
  }
}

Assert-Command "node" "Install Node.js from https://nodejs.org/ and run this command again."
Assert-Command "npm" "Install Node.js from https://nodejs.org/ and run this command again."

New-Item -ItemType Directory -Path $baseDir -Force | Out-Null

if (Test-Path $sourceDir) {
  Remove-Item -LiteralPath $sourceDir -Recurse -Force
}

Write-Host "Downloading LookMeNot from GitHub..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $repoZipUrl -OutFile $zipPath

Write-Host "Preparing local build folder..." -ForegroundColor Cyan
Expand-Archive -Path $zipPath -DestinationPath $baseDir -Force

if (-not (Test-Path $pickerScript)) {
  throw "Could not find package picker at $pickerScript"
}

Write-Host "Starting browser package picker..." -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File $pickerScript