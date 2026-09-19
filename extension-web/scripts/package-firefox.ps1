$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$dist = Join-Path $root "dist"
$firefoxDist = Join-Path $root "dist-firefox"
$packagesRoot = Join-Path $root "dist-packages"
$outputDir = Join-Path $packagesRoot "firefox"
$zip = Join-Path $outputDir "LOOKMENOT-FIREFOX-ADDON-NO-WARNINGS-UPLOAD-THIS.zip"
$sourceZip = Join-Path $outputDir "LOOKMENOT-SOURCE-CODE-NO-WARNINGS-DO-NOT-UPLOAD-AS-ADDON.zip"
$installGuide = Join-Path $outputDir "INSTALL.txt"

if (-not (Test-Path $dist)) {
  throw "Build output not found at $dist"
}

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Assert-UnderRoot($path) {
  $resolved = Resolve-Path -LiteralPath $path -ErrorAction SilentlyContinue
  if ($resolved -and -not $resolved.Path.StartsWith($root.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to operate outside extension root: $($resolved.Path)"
  }
}

function New-ZipFromDirectory($sourceDir, $targetZip) {
  if (Test-Path $targetZip) {
    Assert-UnderRoot $targetZip
    Remove-Item -LiteralPath $targetZip -Force
  }

  $sourceResolved = (Resolve-Path -LiteralPath $sourceDir).Path.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
  $zip = [System.IO.Compression.ZipFile]::Open($targetZip, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    Get-ChildItem -LiteralPath $sourceResolved -Recurse -File | ForEach-Object {
      $relative = $_.FullName.Substring($sourceResolved.Length + 1).Replace("\", "/")
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  } finally {
    $zip.Dispose()
  }
}

function New-ZipFromPaths($paths, $targetZip) {
  if (Test-Path $targetZip) {
    Assert-UnderRoot $targetZip
    Remove-Item -LiteralPath $targetZip -Force
  }

  $rootResolved = $root.Path.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
  $zip = [System.IO.Compression.ZipFile]::Open($targetZip, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    foreach ($path in $paths) {
      $resolved = (Resolve-Path -LiteralPath $path).Path
      if ((Get-Item -LiteralPath $resolved).PSIsContainer) {
        Get-ChildItem -LiteralPath $resolved -Recurse -File | ForEach-Object {
          $relative = $_.FullName.Substring($rootResolved.Length + 1).Replace("\", "/")
          [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
      } else {
        $relative = $resolved.Substring($rootResolved.Length + 1).Replace("\", "/")
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $resolved, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
      }
    }
  } finally {
    $zip.Dispose()
  }
}

if (Test-Path $firefoxDist) {
  Assert-UnderRoot $firefoxDist
  Remove-Item -LiteralPath $firefoxDist -Recurse -Force
}

Copy-Item -LiteralPath $dist -Destination $firefoxDist -Recurse

$manifestPath = Join-Path $firefoxDist "manifest.json"
$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json

$manifest.background = [ordered]@{
  scripts = @("background.js")
}

$manifest | Add-Member -NotePropertyName "browser_specific_settings" -NotePropertyValue ([ordered]@{
  gecko = [ordered]@{
    id = "@lookmenot-langfuse-trace-reader"
    strict_min_version = "142.0"
    data_collection_permissions = [ordered]@{
      required = @("none")
    }
  }
}) -Force

$manifest | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $manifestPath

$contentScriptPath = Join-Path $firefoxDist "assets/content.js"
$contentScript = Get-Content -Raw $contentScriptPath
$contentScript = $contentScript.Replace(".innerHTML=", ".textContent=")
Set-Content -Encoding UTF8 $contentScriptPath $contentScript

New-ZipFromDirectory $firefoxDist $zip

$sourceItems = @(
  "package.json",
  "package-lock.json",
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.node.json",
  "README.md",
  "FIREFOX-AMO.md",
  "public",
  "scripts",
  "src",
  "store-assets"
) | ForEach-Object { Join-Path $root $_ } | Where-Object { Test-Path $_ }

New-ZipFromPaths $sourceItems $sourceZip

@"
LookMeNot package for Firefox

Generated files:
- $zip
- $sourceZip

Temporary local install steps:
1. Open about:debugging#/runtime/this-firefox
2. Click Load Temporary Add-on.
3. Select this file:
  $firefoxDist\manifest.json

Mozilla Add-ons submission:
1. Upload this ZIP as the add-on package:
  $zip
2. Do not upload the source ZIP in the add-on upload field.
3. If AMO asks for source code, upload this source archive:
  $sourceZip
"@ | Set-Content -Encoding UTF8 $installGuide

Write-Host "Created $zip"
Write-Host "Created $sourceZip"
Write-Host "Created $installGuide"
