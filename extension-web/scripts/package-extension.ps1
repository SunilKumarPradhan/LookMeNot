param(
  [ValidateSet("chromium", "chrome", "brave", "edge")]
  [string]$Browser = "chromium"
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$dist = Join-Path $root "dist"
$packagesRoot = Join-Path $root "dist-packages"
$browserSlug = $Browser.ToLowerInvariant()
$outputDir = Join-Path $packagesRoot $browserSlug
$unpackedDir = Join-Path $outputDir "lookmenot-unpacked"
$zip = Join-Path $outputDir "LOOKMENOT-$($browserSlug.ToUpperInvariant())-EXTENSION.zip"
$installGuide = Join-Path $outputDir "INSTALL.txt"

if (-not (Test-Path $dist)) {
  throw "Build output not found at $dist"
}

if (Test-Path $outputDir) {
  Remove-Item -LiteralPath $outputDir -Recurse -Force
}

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
Copy-Item -LiteralPath $dist -Destination $unpackedDir -Recurse

if (Test-Path $zip) {
  Remove-Item -LiteralPath $zip -Force
}

Compress-Archive -Path (Join-Path $dist "*") -DestinationPath $zip -Force

$browserLabel = switch ($browserSlug) {
  "chrome" { "Google Chrome" }
  "brave" { "Brave" }
  "edge" { "Microsoft Edge" }
  default { "Chromium browser" }
}

$extensionsUrl = switch ($browserSlug) {
  "edge" { "edge://extensions" }
  default { "chrome://extensions" }
}

@"
LookMeNot package for $browserLabel

Generated files:
- $zip
- $unpackedDir

Local install steps:
1. Open $extensionsUrl
2. Turn on Developer mode.
3. Click Load unpacked.
4. Select this folder:
   $unpackedDir

For store submission, upload the ZIP file instead of the unpacked folder.
"@ | Set-Content -Encoding UTF8 $installGuide

Write-Host "Created $zip"
Write-Host "Created $unpackedDir"
Write-Host "Created $installGuide"
