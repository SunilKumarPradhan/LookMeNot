#Requires -Version 5.1
<#
.SYNOPSIS
    Downloads the latest LookMeNot browser extension build and gets it ready to load in
    Chrome or Edge.

.DESCRIPTION
    Chrome and Edge do not let any script install an extension into a normal profile
    without going through their extension store, or through the browser's own
    Developer Mode + "Load unpacked" flow. That's a deliberate security boundary, not
    something this script works around. What it automates is everything up to that
    point: fetching the latest release from GitHub, unpacking it to a stable folder,
    opening the right extensions page, and copying that folder's path to your
    clipboard so the last two clicks (turn on Developer mode, click Load unpacked,
    paste path, pick folder) take a few seconds.

.PARAMETER Browser
    Auto (default), Chrome, or Edge. Auto prefers Edge, then Chrome, based on what is
    installed.

.EXAMPLE
    irm https://raw.githubusercontent.com/SunilKumarPradhan/LookMeNot/main/scripts/install.ps1 | iex

.EXAMPLE
    .\install.ps1 -Browser Chrome
#>
[CmdletBinding()]
param(
    [ValidateSet("Auto", "Chrome", "Edge")]
    [string]$Browser = "Auto"
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$RepoApi = "https://api.github.com/repos/SunilKumarPradhan/LookMeNot/releases/latest"
$InstallDir = Join-Path $env:LOCALAPPDATA "LookMeNot\extension"

function Write-Step($text) { Write-Host $text -ForegroundColor Cyan }
function Write-Ok($text) { Write-Host $text -ForegroundColor Green }
function Write-Info($text) { Write-Host $text -ForegroundColor Gray }

function Find-BrowserExe($names) {
    foreach ($name in $names) {
        $appPathsKey = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$name"
        $item = Get-ItemProperty -Path $appPathsKey -ErrorAction SilentlyContinue
        if ($item -and $item."(default)" -and (Test-Path $item."(default)")) { return $item."(default)" }
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }
    return $null
}

Write-Step "LookMeNot installer"

# 1. Find the latest release and its Chrome/Edge build asset (Manifest V3, same package for both).
Write-Step "Checking latest release..."
try {
    $release = Invoke-RestMethod -Uri $RepoApi -Headers @{ "User-Agent" = "LookMeNot-Installer" }
} catch {
    Write-Host "Could not reach the GitHub Releases API: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Build from source instead: https://github.com/SunilKumarPradhan/LookMeNot/tree/main/extension#build" -ForegroundColor Yellow
    exit 1
}

$asset = $release.assets | Where-Object { $_.name -like "*-chrome.zip" } | Select-Object -First 1
if (-not $asset) {
    Write-Host "No Chrome/Edge build found on the latest release ($($release.tag_name))." -ForegroundColor Red
    Write-Host "Build from source instead: https://github.com/SunilKumarPradhan/LookMeNot/tree/main/extension#build" -ForegroundColor Yellow
    exit 1
}

Write-Ok "Found $($release.tag_name): $($asset.name)"

# 2. Download and unpack to a stable, versioned-in-place folder.
Write-Step "Downloading..."
$zipPath = Join-Path $env:TEMP $asset.name
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath -Headers @{ "User-Agent" = "LookMeNot-Installer" }

Write-Step "Unpacking to $InstallDir ..."
if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Expand-Archive -Path $zipPath -DestinationPath $InstallDir -Force
Remove-Item -Force $zipPath

# 3. Pick a browser: explicit -Browser, or Auto (Edge, then Chrome).
$edgeExe = Find-BrowserExe @("msedge.exe")
$chromeExe = Find-BrowserExe @("chrome.exe")

$targetExe = $null
$targetName = $null
$targetPage = $null

if ($Browser -eq "Edge" -or ($Browser -eq "Auto" -and $edgeExe)) {
    if ($edgeExe) { $targetExe = $edgeExe; $targetName = "Edge"; $targetPage = "edge://extensions/" }
    elseif ($Browser -eq "Edge") { Write-Host "Edge was not found on this machine." -ForegroundColor Red }
}
if (-not $targetExe -and ($Browser -eq "Chrome" -or $Browser -eq "Auto")) {
    if ($chromeExe) { $targetExe = $chromeExe; $targetName = "Chrome"; $targetPage = "chrome://extensions/" }
    elseif ($Browser -eq "Chrome") { Write-Host "Chrome was not found on this machine." -ForegroundColor Red }
}

# 4. Copy the folder path so it's ready to paste into the "Load unpacked" dialog.
$clipboardOk = $false
try { Set-Clipboard -Value $InstallDir; $clipboardOk = $true } catch { }

Write-Host ""
Write-Ok "LookMeNot $($release.tag_name) is unpacked at:"
Write-Host "  $InstallDir" -ForegroundColor White
if ($clipboardOk) { Write-Info "(path copied to your clipboard)" }
Write-Host ""

if ($targetExe) {
    Write-Step "Opening $targetName's extensions page..."
    Start-Process -FilePath $targetExe -ArgumentList $targetPage
    Write-Host ""
    Write-Host "Finish the install in $targetName (2 steps, browser-required, cannot be scripted):" -ForegroundColor Yellow
    Write-Host "  1. Turn on 'Developer mode' (top-right toggle)."
    Write-Host "  2. Click 'Load unpacked', then paste the path above and select the folder."
} else {
    Write-Host "Neither Edge nor Chrome was found automatically." -ForegroundColor Yellow
    Write-Host "Open your browser's extensions page (chrome://extensions or edge://extensions), turn on"
    Write-Host "Developer mode, click Load unpacked, and select the folder above. Works the same way in"
    Write-Host "any other Chromium browser (Brave, Vivaldi, ...)."
}

Write-Host ""
Write-Info "To update later, run this installer again - it overwrites $InstallDir with the latest release."
