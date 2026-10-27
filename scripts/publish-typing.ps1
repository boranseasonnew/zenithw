[CmdletBinding()]
param([switch]$PreviewOnly)
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskRepo = 'boranseasonnew/zenithw'
$taskUtf8 = [Text.UTF8Encoding]::new($false)
function Invoke-TypingGh {
    param([string]$Route,[string]$Method='GET',$Body=$null)
    $taskArgs = @('api',$Route,'--method',$Method,'--header','Accept: application/vnd.github+json')
    $taskBodyPath = $null
    try {
        if ($null -ne $Body) {
            $taskBodyPath = Join-Path ([IO.Path]::GetTempPath()) ('zenith-type-api-'+[guid]::NewGuid().ToString('N')+'.json')
            [IO.File]::WriteAllText($taskBodyPath,($Body | ConvertTo-Json -Depth 100 -Compress),$taskUtf8)
            $taskArgs += @('--input',$taskBodyPath)
        }
        $taskOutput = & gh @taskArgs
        if ($LASTEXITCODE -ne 0) { throw "GitHub request failed: $Method $Route" }
        return ($taskOutput | Out-String | ConvertFrom-Json)
    } finally {
        if ($taskBodyPath -and (Test-Path -LiteralPath $taskBodyPath)) { Remove-Item -LiteralPath $taskBodyPath }
    }
}
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'Install GitHub CLI, then run gh auth login.' }
$taskRepoInfo = Invoke-TypingGh "repos/$taskRepo"
$taskBranch = $taskRepoInfo.default_branch
$taskRef = Invoke-TypingGh "repos/$taskRepo/git/ref/heads/$taskBranch"
$taskHead = $taskRef.object.sha
$taskParent = Invoke-TypingGh "repos/$taskRepo/git/commits/$taskHead"
$taskMiddleware = Invoke-TypingGh "repos/$taskRepo/contents/functions/_middleware.js?ref=$taskHead"
$taskRemoteMiddleware = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(($taskMiddleware.content -replace '\s','')))
$taskImport = 'import { PAGES_CSP } from "../shared/pages-security.mjs";'
$taskAnchor = '  if (isHtml) headers.set("Content-Security-Policy", PAGES_CSP);'
if (-not $taskRemoteMiddleware.Contains('import { TYPING_CSP }')) {
    if (-not $taskRemoteMiddleware.Contains($taskImport) -or -not $taskRemoteMiddleware.Contains($taskAnchor)) {
        throw 'The upstream middleware changed. Review it before publishing; no branch was modified.'
    }
    $taskRemoteMiddleware = $taskRemoteMiddleware.Replace($taskImport,$taskImport+"`n"+'import { TYPING_CSP } from "../shared/typing-security.mjs";')
    $taskReplacement = '  if (isHtml) {'+"`n"+'    const typing = /^\/typing(?:\.html)?\/?$/.test(new URL(context.request.url).pathname);'+"`n"+'    headers.set("Content-Security-Policy", typing ? TYPING_CSP : PAGES_CSP);'+"`n"+'  }'
    $taskRemoteMiddleware = $taskRemoteMiddleware.Replace($taskAnchor,$taskReplacement)
}
$taskFiles = @(
 'frontend/typing.html','frontend/typing.js','frontend/typing-focus.css','frontend/typing-config.js',
 'frontend/typing-online.js','frontend/typing-companions.js','frontend/typing-duels.js',
 'shared/typing-security.mjs','supabase/config.toml','supabase/typing-schema.sql','supabase/typing-duels-schema.sql',
 'supabase/functions/typing-api/index.ts','supabase/functions/typing-api/core.mjs',
 'supabase/functions/typing-api/words.mjs','supabase/functions/typing-api/duels.mjs',
 'tests/typing-verification.test.mjs','tests/typing-routing.test.mjs','docs/TYPING.md','scripts/publish-typing.ps1'
)
foreach ($taskFile in $taskFiles) { if (-not (Test-Path -LiteralPath (Join-Path $taskRoot $taskFile))) { throw "Missing source: $taskFile" } }
Write-Host "Target: $taskRepo / $taskBranch" -ForegroundColor Cyan
Write-Host ('Files: '+($taskFiles.Count+1)+' (only Zenith Type and its scoped CSP change)')
if ($PreviewOnly) {
    $taskFiles | ForEach-Object { Write-Host "  $_" }
    Write-Host '  functions/_middleware.js (patched from upstream, preserving other changes)'
    Write-Host 'Preview only; no GitHub writes performed.'
    return
}
$taskTreeItems = @()
foreach ($taskFile in $taskFiles) {
    $taskBytes = [IO.File]::ReadAllBytes((Join-Path $taskRoot $taskFile))
    $taskBlob = Invoke-TypingGh "repos/$taskRepo/git/blobs" 'POST' @{encoding='base64';content=[Convert]::ToBase64String($taskBytes)}
    $taskTreeItems += @{path=$taskFile;mode='100644';type='blob';sha=$taskBlob.sha}
}
$taskMiddlewareBlob = Invoke-TypingGh "repos/$taskRepo/git/blobs" 'POST' @{encoding='base64';content=[Convert]::ToBase64String($taskUtf8.GetBytes($taskRemoteMiddleware))}
$taskTreeItems += @{path='functions/_middleware.js';mode='100644';type='blob';sha=$taskMiddlewareBlob.sha}
$taskTree = Invoke-TypingGh "repos/$taskRepo/git/trees" 'POST' @{base_tree=$taskParent.tree.sha;tree=$taskTreeItems}
$taskDate = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
$taskAuthor = @{name='boranseason';email='214559288+boranseasonnew@users.noreply.github.com';date=$taskDate}
$taskMessage = "Add Zenith Type accounts, verified rankings and typing duels`n`nCo-authored-by: Codex <codex@openai.com>"
$taskCommit = Invoke-TypingGh "repos/$taskRepo/git/commits" 'POST' @{message=$taskMessage;tree=$taskTree.sha;parents=@($taskHead);author=$taskAuthor;committer=$taskAuthor}
# A non-fast-forward update fails instead of discarding remote work.
$null = Invoke-TypingGh "repos/$taskRepo/git/refs/heads/$taskBranch" 'PATCH' @{sha=$taskCommit.sha;force=$false}
Write-Host "Published source commit: https://github.com/$taskRepo/commit/$($taskCommit.sha)" -ForegroundColor Green
Write-Host 'Cloudflare Pages must finish its connected Git build before /typing becomes available.'
Write-Host 'Expected page: https://zenithw.space/typing'
