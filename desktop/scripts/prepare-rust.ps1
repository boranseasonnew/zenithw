[CmdletBinding()]
param(
    [string]$ToolSource = $env:ZENITHW_TOOL_SOURCE,
    [switch]$UiOnly
)

$ErrorActionPreference = 'Stop'
$desktop = Split-Path $PSScriptRoot -Parent
$ui = Join-Path $desktop 'ui'
$renderer = @(
    'app.html', 'app.css', 'app.js', 'brand.png', 'desktop-news.js', 'locales.js', 'native.js',
    'premium.css', 'ui-copy.js', 'upgrade-copy.js', 'upgrade.css',
    'workspace-copy.js', 'workspace.css'
)

New-Item -ItemType Directory -Path $ui -Force | Out-Null
$unexpected = Get-ChildItem -LiteralPath $ui -Force | Where-Object { $_.PSIsContainer -or $_.Name -notin $renderer }
if ($unexpected) {
    throw "Unexpected files in the generated renderer folder: $($unexpected.Name -join ', ')"
}
foreach ($name in $renderer) {
    Copy-Item -LiteralPath (Join-Path $desktop "src/$name") -Destination (Join-Path $ui $name) -Force
}
Write-Host "Staged $($renderer.Count) renderer assets."
if ($UiOnly) { return }

. (Join-Path $PSScriptRoot 'rust-package-common.ps1')
$bin = Join-Path $desktop 'resources/bin'
if (-not $ToolSource) {
    $missing = $MediaTools | Where-Object { -not (Test-Path -LiteralPath (Join-Path $bin $_) -PathType Leaf) }
    if (-not $missing) {
        Write-Host 'Reusing the staged media tools.'
        return
    }
    $ToolSource = Join-Path $env:LOCALAPPDATA 'Programs/Zenith/resources/bin'
}
$source = (Resolve-Path -LiteralPath $ToolSource).Path
foreach ($name in $MediaTools) {
    if (-not (Test-Path -LiteralPath (Join-Path $source $name) -PathType Leaf)) {
        throw "Required media tool missing from the source directory: $name"
    }
}
New-Item -ItemType Directory -Path $bin -Force | Out-Null
if ((Resolve-Path -LiteralPath $bin).Path -ne $source) {
    foreach ($name in $MediaTools) {
        Copy-Item -LiteralPath (Join-Path $source $name) -Destination (Join-Path $bin $name) -Force
    }
}
Write-Host "Staged $($MediaTools.Count) media tools."
