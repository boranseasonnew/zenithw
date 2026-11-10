$MediaTools = @('yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe', 'aria2c.exe', 'deno.exe')

function Get-ZenithVersion {
    param([string]$Desktop)

    $config = Get-Content -LiteralPath (Join-Path $Desktop 'native/tauri.conf.json') -Raw | ConvertFrom-Json
    $version = $config.version
    if ($version -notmatch '^\d+\.\d+\.\d+$') { throw "Invalid release version: $version" }
    $cargoManifest = Get-Content -LiteralPath (Join-Path $Desktop 'native/Cargo.toml') -Raw
    if ($cargoManifest -notmatch '(?m)^version = "([^"]+)"\s*$' -or $Matches[1] -ne $version) {
        throw 'Cargo and Tauri release versions must match.'
    }
    $version
}

function Copy-ZenithPayload {
    param([string]$Desktop, [string]$ExePath, [string]$Destination, [string]$Version, [string]$CargoPath)

    if (-not $CargoPath) { $CargoPath = (Get-Command cargo.exe -ErrorAction SilentlyContinue).Source }
    if (-not $CargoPath) { throw 'Install Cargo or pass -CargoPath to collect the locked Rust dependencies and their notices.' }
    $exe = Get-Item -LiteralPath $ExePath
    if ($exe.PSIsContainer -or $exe.Extension -ne '.exe') { throw "Expected the compiled ZenithW EXE: $ExePath" }
    if ($exe.VersionInfo.ProductVersion -notin @($Version, "$Version.0")) {
        throw "The EXE product version '$($exe.VersionInfo.ProductVersion)' does not match $Version."
    }
    $sourceBin = Join-Path $Desktop 'resources/bin'
    $mediaNotice = Join-Path $sourceBin 'THIRD_PARTY_MEDIA.txt'
    $mediaLock = Get-Content -LiteralPath (Join-Path $Desktop 'scripts/media-tools.json') -Raw | ConvertFrom-Json
    if (-not (Test-Path -LiteralPath $mediaNotice -PathType Leaf)) {
        throw 'Run stage-release-tools.ps1 to prepare the pinned media binaries and notices.'
    }

    $destinationBin = Join-Path $Destination 'bin'
    New-Item -ItemType Directory -Path $destinationBin -Force | Out-Null
    Copy-Item -LiteralPath $exe.FullName -Destination (Join-Path $Destination 'Zenith.exe')
    foreach ($name in $MediaTools) {
        $tool = Join-Path $sourceBin $name
        if (-not (Test-Path -LiteralPath $tool -PathType Leaf)) {
            throw "Missing $name. Run stage-release-tools.ps1."
        }
        $copy = Join-Path $destinationBin $name
        Copy-Item -LiteralPath $tool -Destination $copy
        $pinned = $mediaLock | ForEach-Object { $_.binaries.PSObject.Properties[$name] } | Where-Object { $_ } | Select-Object -First 1
        if (-not $pinned -or (Get-FileHash -LiteralPath $copy).Hash -ne $pinned.Value) {
            throw "$name differs from the release tool lock. Run stage-release-tools.ps1."
        }
    }
    foreach ($name in @('LICENSE', 'THIRD_PARTY_NOTICES.md')) {
        Copy-Item -LiteralPath (Join-Path $Desktop $name) -Destination (Join-Path $Destination $name)
    }
    $notices = Join-Path $Destination 'THIRD_PARTY_LICENSES.txt'
    Write-ZenithNotices -Desktop $Desktop -MediaNotice $mediaNotice -CargoPath $CargoPath -Destination $notices

    $rustc = Join-Path (Split-Path (Resolve-Path -LiteralPath $CargoPath).Path -Parent) 'rustc.exe'
    if (-not (Test-Path -LiteralPath $rustc -PathType Leaf)) { throw 'Cargo and rustc must belong to the same Windows toolchain.' }
    $sysroot = & $rustc --print sysroot
    if ($LASTEXITCODE -ne 0) { throw 'Could not locate the Rust toolchain directory.' }
    $runtimeNotice = Join-Path $sysroot 'share/doc/rust/COPYRIGHT-library.html'
    if (-not (Test-Path -LiteralPath $runtimeNotice -PathType Leaf)) { throw 'The Rust toolchain is missing its standard library copyright notice.' }
    $rustVersion = & $rustc --version --verbose
    if ($LASTEXITCODE -ne 0 -or ($rustVersion -join "`n") -notmatch '(?m)^commit-hash: ([a-f0-9]{40})$') {
        throw 'Could not determine the exact Rust compiler revision.'
    }
    $rustSource = "https://github.com/rust-lang/rust/tree/$($Matches[1])/library"
    Copy-Item -LiteralPath $runtimeNotice -Destination (Join-Path $Destination 'THIRD_PARTY_RUST_RUNTIME.html')
    Add-Content -LiteralPath $notices -Encoding utf8 -Value @('', 'Rust standard library notices are in THIRD_PARTY_RUST_RUNTIME.html.', "Exact standard library source: $rustSource")
}

function Write-ZenithNotices {
    param([string]$Desktop, [string]$MediaNotice, [string]$Destination, [string]$CargoPath)

    if (-not $CargoPath) { $CargoPath = (Get-Command cargo.exe -ErrorAction SilentlyContinue).Source }
    if (-not $CargoPath) { throw 'Install Cargo or pass -CargoPath to collect the locked Rust dependencies and their notices.' }
    $metadataText = & $CargoPath metadata --offline --locked --format-version 1 --filter-platform x86_64-pc-windows-msvc --manifest-path (Join-Path $Desktop 'native/Cargo.toml')
    if ($LASTEXITCODE -ne 0) { throw 'Cargo could not read the locked Windows dependency sources.' }
    $metadata = $metadataText | ConvertFrom-Json
    $nodes = @{}
    foreach ($node in $metadata.resolve.nodes) { $nodes[$node.id] = $node }
    $included = [System.Collections.Generic.HashSet[string]]::new()
    $pending = [System.Collections.Generic.Queue[string]]::new()
    $repositoryLicenses = @{
        'https://github.com/dropbox/rust-alloc-no-stdlib' = @('LICENSE')
        'https://github.com/tauri-apps/tauri' = @('LICENSE-APACHE-2.0', 'LICENSE-MIT')
        'https://github.com/wravery/webview2-rs' = @('LICENSE')
    }
    $licenseText = @{}
    $pending.Enqueue($metadata.resolve.root)
    while ($pending.Count) {
        $id = $pending.Dequeue()
        if (-not $included.Add($id)) { continue }
        foreach ($dependency in $nodes[$id].deps) {
            if ($dependency.dep_kinds | Where-Object { $_.kind -in @($null, 'build') }) { $pending.Enqueue($dependency.pkg) }
        }
    }

    $writer = [IO.StreamWriter]::new($Destination, $false, [Text.UTF8Encoding]::new($false))
    try {
        $writer.WriteLine([IO.File]::ReadAllText($MediaNotice))
        $writer.WriteLine('Rust dependency notices for Windows x64 (runtime and build dependencies)')
        $writer.WriteLine('Dependency versions are recorded in desktop/native/Cargo.lock.')
        foreach ($package in ($metadata.packages | Where-Object { $_.source -and $included.Contains($_.id) } | Sort-Object name, version)) {
            $root = Split-Path $package.manifest_path -Parent
            $writer.WriteLine()
            $writer.WriteLine("=== $($package.name) $($package.version) ===")
            $writer.WriteLine("License: $($package.license)")
            if ($package.repository) { $writer.WriteLine("Repository: $($package.repository)") }
            $writer.WriteLine("Exact crate source: https://crates.io/api/v1/crates/$($package.name)/$($package.version)/download")
            $licenses = @(Get-ChildItem -LiteralPath $root -Force -File |
                Where-Object { $_.Name.ToUpperInvariant() -cmatch '^(LICENSE|LICENCE|UNLICENSE|NOTICE|COPYING|COPYRIGHT)([._-]|$)' } |
                Select-Object -ExpandProperty FullName)
            if ($package.license_file) { $licenses += Join-Path $root $package.license_file }
            if (-not $licenses -and $package.repository -and $repositoryLicenses.ContainsKey($package.repository)) {
                $vcs = Get-Content -LiteralPath (Join-Path $root '.cargo_vcs_info.json') -Raw | ConvertFrom-Json
                if ($vcs.git.sha1 -notmatch '^[a-f0-9]{40}$') { throw "Missing upstream revision for $($package.name)." }
                $repository = $package.repository.Substring('https://github.com/'.Length)
                foreach ($name in $repositoryLicenses[$package.repository]) {
                    $url = "https://raw.githubusercontent.com/$repository/$($vcs.git.sha1)/$name"
                    if (-not $licenseText.ContainsKey($url)) { $licenseText[$url] = (Invoke-WebRequest -Uri $url).Content }
                    $writer.WriteLine()
                    $writer.WriteLine("--- $url ---")
                    $writer.WriteLine([string]$licenseText[$url])
                }
            } elseif (-not $licenses -and $package.license -eq 'MPL-2.0') {
                $mpl = $metadata.packages | Where-Object name -eq 'cssparser' | Select-Object -First 1
                $licenses = @(Join-Path (Split-Path $mpl.manifest_path -Parent) 'LICENSE')
            } elseif (-not $licenses) {
                throw "No license notice was found for $($package.name) $($package.version)."
            }
            foreach ($license in ($licenses | Sort-Object -Unique)) {
                $writer.WriteLine()
                $writer.WriteLine("--- $(Split-Path $license -Leaf) ---")
                $writer.WriteLine([IO.File]::ReadAllText($license))
            }
        }
    } finally {
        $writer.Dispose()
    }
}

function Write-ZenithChecksums {
    param([string[]]$Files, [string]$Destination)

    $lines = foreach ($file in $Files) {
        $hash = Get-FileHash -LiteralPath $file -Algorithm SHA256
        "$($hash.Hash.ToLowerInvariant())  $(Split-Path $file -Leaf)"
    }
    $lines | Set-Content -LiteralPath $Destination -Encoding ascii
}

function Remove-ZenithStaging {
    param([string]$Path, [string]$OutputDirectory)

    $target = (Resolve-Path -LiteralPath $Path).Path
    $parent = (Resolve-Path -LiteralPath $OutputDirectory).Path
    if ((Split-Path $target -Parent) -ne $parent -or (Split-Path $target -Leaf) -notmatch '^\.zenith-package-[0-9a-f]{32}$') {
        throw "Unexpected staging directory: $target"
    }
    Remove-Item -LiteralPath $target -Recurse -Force
}
