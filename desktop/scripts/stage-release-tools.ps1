[CmdletBinding()]
param([string]$CacheDirectory)

$ErrorActionPreference = 'Stop'
$desktop = Split-Path $PSScriptRoot -Parent
$output = Join-Path $desktop 'resources/bin'
if (-not $CacheDirectory) { $CacheDirectory = Join-Path $desktop 'dist/verified-tools' }
New-Item -ItemType Directory -Path $CacheDirectory, $output -Force | Out-Null
$cache = (Resolve-Path -LiteralPath $CacheDirectory).Path
$lock = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'media-tools.json') -Raw | ConvertFrom-Json
$parts = [System.Collections.Generic.List[string]]::new()
$parts.Add('ZenithW Windows release media tools and upstream notices')
$parts.Add('These independently distributed tools retain their own licenses. The release archive, exact source reference and executable digests are recorded below.')
$stage = Join-Path $output ".zenith-package-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $stage | Out-Null
. (Join-Path $PSScriptRoot 'rust-package-common.ps1')
try {
    foreach ($tool in $lock) {
        $artifact = Join-Path $cache $tool.artifact
        if (-not (Test-Path -LiteralPath $artifact) -or (Get-FileHash -LiteralPath $artifact).Hash -ne $tool.sha256) {
            $partial = "$artifact.partial"
            & curl.exe --retry 3 --fail --location --silent --show-error --output $partial $tool.url
            if ($LASTEXITCODE -ne 0 -or (Get-FileHash -LiteralPath $partial).Hash -ne $tool.sha256) {
                if (Test-Path -LiteralPath $partial) { Remove-Item -LiteralPath $partial -Force }
                throw "Release download or SHA256 verification failed for $($tool.name)."
            }
            Move-Item -LiteralPath $partial -Destination $artifact -Force
        }
        $parts.Add("=== $($tool.name) $($tool.version) ===")
        $parts.Add("Release binary archive: $($tool.url)")
        $parts.Add("Archive SHA256: $($tool.sha256)")
        $parts.Add("Upstream source: $($tool.source)")

        $archive = if ($tool.artifact.EndsWith('.zip')) { [IO.Compression.ZipFile]::OpenRead($artifact) } else { $null }
        try {
            foreach ($binary in $tool.binaries.PSObject.Properties) {
                $name = $binary.Name
                $staged = Join-Path $stage $name
                if ($archive) {
                    $entry = @($archive.Entries | Where-Object Name -eq $name)
                    if ($entry.Count -ne 1) { throw "Expected one $name in $($tool.artifact)." }
                    [IO.Compression.ZipFileExtensions]::ExtractToFile($entry[0], $staged)
                } else {
                    Copy-Item -LiteralPath $artifact -Destination $staged
                }
                if ((Get-FileHash -LiteralPath $staged).Hash -ne $binary.Value) { throw "SHA256 mismatch for $name." }
                $parts.Add("$name SHA256: $($binary.Value)")
            }
            foreach ($name in $tool.archiveNotices) {
                $entry = @($archive.Entries | Where-Object Name -eq $name)
                if ($entry.Count -ne 1) { throw "Expected one $name in $($tool.artifact)." }
                $reader = [IO.StreamReader]::new($entry[0].Open())
                try {
                    $parts.Add("--- $name from the verified release archive ---")
                    $parts.Add($reader.ReadToEnd())
                } finally {
                    $reader.Dispose()
                }
            }
        } finally {
            if ($archive) { $archive.Dispose() }
        }
        foreach ($url in $tool.notices) {
            $file = Join-Path $stage 'notice.txt'
            & curl.exe --retry 3 --fail --location --silent --show-error --output $file $url
            if ($LASTEXITCODE -ne 0) { throw "Could not obtain the upstream notice: $url" }
            $parts.Add("--- $url ---")
            $parts.Add([IO.File]::ReadAllText($file))
        }
    }

    $parts.Add('The installer includes the Microsoft Edge WebView2 Evergreen Bootstrapper from https://developer.microsoft.com/microsoft-edge/webview2/.')
    $notice = Join-Path $stage 'THIRD_PARTY_MEDIA.txt'
    [IO.File]::WriteAllText($notice, ($parts -join "`n`n"), [Text.UTF8Encoding]::new($false))
    foreach ($name in ($MediaTools + 'THIRD_PARTY_MEDIA.txt')) {
        Move-Item -LiteralPath (Join-Path $stage $name) -Destination $output -Force
    }
    Write-Host 'Staged all five pinned Windows media tools and their upstream notices.'
} finally {
    Remove-ZenithStaging -Path $stage -OutputDirectory $output
}
