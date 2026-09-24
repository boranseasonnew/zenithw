param(
    [Parameter(Mandatory = $true)][string]$CloudflareAccountId,
    [Parameter(Mandatory = $true)][string]$CloudflareProject,
    [Parameter(Mandatory = $true)][string]$CloudflareProductionBranch,
    [Parameter(Mandatory = $true)][string]$AwsAccountId,
    [Parameter(Mandatory = $true)][string]$AwsRegion,
    [Parameter(Mandatory = $true)][string]$Ec2InstanceId
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

if ((git status --porcelain)) { throw 'Working tree must be clean before deployment.' }
if ((git branch --show-current) -ne $CloudflareProductionBranch) {
    throw 'Local branch does not match the requested Cloudflare production branch.'
}
foreach ($name in @('git', 'npx.cmd', 'aws', 'ssh', 'scp')) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { throw "Required command missing: $name" }
}

$env:CLOUDFLARE_ACCOUNT_ID = $CloudflareAccountId
$projectsJson = & npx.cmd wrangler pages project list --json
if ($LASTEXITCODE -ne 0) { throw 'Cloudflare project listing failed.' }
$projectsResponse = $projectsJson | ConvertFrom-Json
$projects = if ($projectsResponse.result) { @($projectsResponse.result) } else { @($projectsResponse) }
$matchingProjects = @($projects | Where-Object { $_.name -eq $CloudflareProject })
if ($matchingProjects.Count -ne 1) { throw 'Expected existing Cloudflare Pages project was not found exactly once.' }
if ($matchingProjects[0].production_branch -ne $CloudflareProductionBranch) {
    throw 'Cloudflare production branch differs from the requested branch.'
}

$identityJson = & aws sts get-caller-identity --region $AwsRegion --output json
if ($LASTEXITCODE -ne 0) { throw 'AWS identity lookup failed.' }
$identity = $identityJson | ConvertFrom-Json
if ($identity.Account -ne $AwsAccountId) { throw 'AWS account does not match the expected account.' }
$ec2Json = & aws ec2 describe-instances --instance-ids $Ec2InstanceId --region $AwsRegion --output json
if ($LASTEXITCODE -ne 0) { throw 'EC2 instance lookup failed.' }
$ec2 = $ec2Json | ConvertFrom-Json
$instances = @($ec2.Reservations | ForEach-Object { $_.Instances })
if ($instances.Count -ne 1 -or $instances[0].InstanceId -ne $Ec2InstanceId) {
    throw 'Expected EC2 instance was not found exactly once.'
}
if ($instances[0].State.Name -ne 'running') { throw 'EC2 instance is not running.' }

[pscustomobject]@{
    Commit = git rev-parse HEAD
    CloudflareAccount = $CloudflareAccountId
    CloudflareProject = $CloudflareProject
    CloudflareProductionBranch = $CloudflareProductionBranch
    AwsAccount = $identity.Account
    AwsRegion = $AwsRegion
    Ec2Instance = $instances[0].InstanceId
    Ec2Name = (@($instances[0].Tags | Where-Object { $_.Key -eq 'Name' } | Select-Object -ExpandProperty Value) -join ', ')
    Ec2PublicDns = $instances[0].PublicDnsName
    Ec2PublicIp = $instances[0].PublicIpAddress
}
