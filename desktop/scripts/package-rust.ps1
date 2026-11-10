[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ExePath,
    [string]$OutputDirectory,
    [string]$MakensisPath,
    [string]$CargoPath
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'rust-package-common.ps1')
$desktop = Split-Path $PSScriptRoot -Parent
$version = Get-ZenithVersion -Desktop $desktop
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $desktop 'dist' }
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$output = (Resolve-Path -LiteralPath $OutputDirectory).Path

$stage = Join-Path $output ".zenith-package-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $stage | Out-Null
try {
    if (-not $MakensisPath) {
        $compilerUrl = 'https://github.com/tauri-apps/binary-releases/releases/download/nsis-3.13/nsis-3.13.zip'
        $compilerSha256 = 'ba63dffc4410ee89193e1cb5a41989991bd77c61068da17e3156d136b7b0b3d8'
        $cache = Join-Path $output 'verified-tools'
        New-Item -ItemType Directory -Path $cache -Force | Out-Null
        $archive = Join-Path $cache 'nsis-3.13.zip'
        if (-not (Test-Path -LiteralPath $archive) -or (Get-FileHash -LiteralPath $archive).Hash -ne $compilerSha256) {
            $download = Join-Path $stage 'nsis-3.13.zip'
            & curl.exe --retry 3 --fail --location --silent --show-error --output $download $compilerUrl
            if ($LASTEXITCODE -ne 0 -or (Get-FileHash -LiteralPath $download).Hash -ne $compilerSha256) {
                throw 'NSIS compiler download or SHA256 verification failed.'
            }
            Move-Item -LiteralPath $download -Destination $archive -Force
        }
        Expand-Archive -LiteralPath $archive -DestinationPath $stage
        $MakensisPath = Join-Path $stage 'nsis-3.13/makensis.exe'
    }
    $compiler = (Resolve-Path -LiteralPath $MakensisPath).Path
    $compilerLicense = Join-Path (Split-Path $compiler -Parent) 'COPYING'
    if (-not (Test-Path -LiteralPath $compilerLicense -PathType Leaf)) { throw 'The NSIS distribution is missing COPYING.' }

    $payload = Join-Path $stage 'payload'
    Copy-ZenithPayload -Desktop $desktop -ExePath $ExePath -Destination $payload -Version $version -CargoPath $CargoPath
    $nsisLicense = [IO.File]::ReadAllText($compilerLicense)
    Add-Content -LiteralPath (Join-Path $payload 'THIRD_PARTY_LICENSES.txt') -Encoding utf8 -Value @(
        '', '=== NSIS installer runtime ===',
        'Source: https://sourceforge.net/projects/nsis/files/NSIS%203/',
        $nsisLicense
    )

    $bootstrap = Join-Path $stage 'MicrosoftEdgeWebview2Setup.exe'
    Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $bootstrap
    $signature = Get-AuthenticodeSignature -LiteralPath $bootstrap
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch '^CN=Microsoft Corporation(?:,|$)') {
        throw 'The WebView2 bootstrapper does not have a valid Microsoft signature.'
    }

    $setupName = "Zenith-$version-Windows-Setup.exe"
    $setup = Join-Path $stage $setupName
    $icon = Join-Path $desktop 'build/icon.ico'
    & $compiler /INPUTCHARSET UTF8 "/DAPP_VERSION=$version" "/DPAYLOAD=$payload" "/DBOOTSTRAP=$bootstrap" "/DAPP_ICON=$icon" "/DSETUP_EXE=$setup" (Join-Path $PSScriptRoot 'zenith-installer.nsi')
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $setup -PathType Leaf)) {
        throw 'NSIS did not produce the installer.'
    }

    Set-Content -LiteralPath (Join-Path $payload 'portable.marker') -Value $version -Encoding ascii
    $portableName = "Zenith-$version-Windows.zip"
    $portable = Join-Path $stage $portableName
    [System.IO.Compression.ZipFile]::CreateFromDirectory($payload, $portable)

    $files = @($setup, $portable)
    Write-ZenithChecksums -Files $files -Destination (Join-Path $stage 'SHA256SUMS.txt')
    foreach ($file in ($files + (Join-Path $stage 'SHA256SUMS.txt'))) {
        Move-Item -LiteralPath $file -Destination $output -Force
    }
    Write-Host "Installer, portable ZIP and SHA256SUMS.txt saved in $output."
}
finally {
    Remove-ZenithStaging -Path $stage -OutputDirectory $output
}
