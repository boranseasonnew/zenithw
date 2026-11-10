[CmdletBinding(DefaultParameterSetName = 'Store')]
param(
    [Parameter(Mandatory)][string]$ExePath,
    [Parameter(ParameterSetName = 'Store')][string]$IdentityPath,
    [Parameter(Mandatory, ParameterSetName = 'Draft')][switch]$Draft,
    [string]$OutputDirectory,
    [string]$MakeAppxPath,
    [string]$CargoPath
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'rust-package-common.ps1')
$desktop = Split-Path $PSScriptRoot -Parent
$version = Get-ZenithVersion -Desktop $desktop
$workspace = Split-Path $desktop -Parent

if ($Draft) {
    $identity = @{
        identityName = 'ZenithW.LocalPreparation'
        publisher = 'CN=ZenithW.LocalPreparation'
        publisherDisplayName = 'ZenithW (local draft)'
    }
} else {
    if (-not $IdentityPath) { $IdentityPath = Join-Path $desktop 'store/identity.json' }
    if (-not (Test-Path -LiteralPath $IdentityPath -PathType Leaf)) {
        throw 'Copy the existing Partner Center identity into desktop/store/identity.json, or use -Draft to test packaging.'
    }
    $identity = Get-Content -LiteralPath $IdentityPath -Raw | ConvertFrom-Json
    if ($identity.identityName -notmatch '^[A-Za-z0-9.-]{3,50}$' -or
        $identity.publisher -notmatch '^CN=\S' -or
        [string]::IsNullOrWhiteSpace($identity.publisherDisplayName) -or
        ($identity.identityName + $identity.publisher + $identity.publisherDisplayName) -match 'LocalPreparation|local draft|placeholder') {
        throw 'Use the existing product Name, Publisher and PublisherDisplayName from Partner Center.'
    }
}
if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path $workspace "ZenithW-Builds/Microsoft-Store-Preparation/$version"
}
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$output = (Resolve-Path -LiteralPath $OutputDirectory).Path

if (-not $MakeAppxPath) { $MakeAppxPath = (Get-Command MakeAppx.exe -ErrorAction SilentlyContinue).Source }
if (-not $MakeAppxPath) {
    $sdk = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits/10/bin'
    if (Test-Path -LiteralPath $sdk) {
        $MakeAppxPath = Get-ChildItem -LiteralPath $sdk -Directory |
            Where-Object { $_.Name -match '^\d+(\.\d+){3}$' } |
            Sort-Object { [version]$_.Name } -Descending |
            ForEach-Object { Join-Path $_.FullName 'x64/MakeAppx.exe' } |
            Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
            Select-Object -First 1
    }
}
if (-not $MakeAppxPath) { throw 'Install the Windows SDK or pass MakeAppx.exe with -MakeAppxPath.' }

$stage = Join-Path $output ".zenith-package-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $stage | Out-Null
try {
    $payload = Join-Path $stage 'payload'
    Copy-ZenithPayload -Desktop $desktop -ExePath $ExePath -Destination $payload -Version $version -CargoPath $CargoPath
    $assets = Join-Path $payload 'assets'
    New-Item -ItemType Directory -Path $assets | Out-Null
    foreach ($name in @('Square150x150Logo.png', 'Square310x310Logo.png', 'Square44x44Logo.png', 'StoreLogo.png', 'Wide310x150Logo.png')) {
        Copy-Item -LiteralPath (Join-Path $desktop "build/appx/$name") -Destination (Join-Path $assets $name)
    }

    $identityName = [System.Security.SecurityElement]::Escape($identity.identityName)
    $publisher = [System.Security.SecurityElement]::Escape($identity.publisher)
    $publisherDisplayName = [System.Security.SecurityElement]::Escape($identity.publisherDisplayName)
    $manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
         IgnorableNamespaces="uap rescap">
  <Identity Name="$identityName" Publisher="$publisher" Version="$version.0" ProcessorArchitecture="x64" />
  <Properties>
    <DisplayName>ZenithW Desktop</DisplayName>
    <PublisherDisplayName>$publisherDisplayName</PublisherDisplayName>
    <Logo>assets\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.19041.0" MaxVersionTested="10.0.26100.0" />
  </Dependencies>
  <Resources>
    <Resource Language="tr-TR" />
    <Resource Language="en-US" />
    <Resource Language="de-DE" />
    <Resource Language="ru-RU" />
  </Resources>
  <Applications>
    <Application Id="ZenithW" Executable="Zenith.exe" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements DisplayName="ZenithW Desktop" Description="ZenithW Desktop"
                          Square150x150Logo="assets\Square150x150Logo.png"
                          Square44x44Logo="assets\Square44x44Logo.png" BackgroundColor="#151515">
        <uap:DefaultTile Wide310x150Logo="assets\Wide310x150Logo.png"
                         Square310x310Logo="assets\Square310x310Logo.png" />
      </uap:VisualElements>
    </Application>
  </Applications>
  <Capabilities>
    <rescap:Capability Name="runFullTrust" />
  </Capabilities>
</Package>
"@
    $manifestPath = Join-Path $payload 'AppxManifest.xml'
    [IO.File]::WriteAllText($manifestPath, $manifest, [Text.UTF8Encoding]::new($false))

    $suffix = if ($Draft) { '-DRAFT' } else { '' }
    $packageName = "ZenithW-$version-Store-x64$suffix.appx"
    $package = Join-Path $stage $packageName
    & $MakeAppxPath pack /h SHA256 /d $payload /p $package
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $package -PathType Leaf)) {
        throw 'MakeAppx did not produce a valid application package.'
    }
    $sumsName = if ($Draft) { 'DRAFT-SHA256SUMS.txt' } else { 'SHA256SUMS.txt' }
    $checksums = Join-Path $stage $sumsName
    Write-ZenithChecksums -Files @($package) -Destination $checksums
    Move-Item -LiteralPath $package -Destination $output -Force
    Move-Item -LiteralPath $checksums -Destination $output -Force
    Write-Host "Store APPX package saved in $(Join-Path $output $packageName)."
}
finally {
    Remove-ZenithStaging -Path $stage -OutputDirectory $output
}
