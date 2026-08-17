<#
.SYNOPSIS
    One-time setup: creates the loader's virtualenv and its config file.

.DESCRIPTION
    Everything mutable lives in %USERPROFILE%\.nba-loader -- outside the
    repository, so no credential can be committed by accident:

        .nba-loader\
            venv\          pinned dependencies, isolated from global site-packages
            config.ps1     credentials (created from config.example.ps1)
            logs\          one timestamped log per run, pruned after 30 days
            LAST_RUN.txt   OK/FAIL summary of the most recent run

    Safe to re-run; it will not overwrite an existing config.ps1.
#>
[CmdletBinding()]
param(
    [string]$StateDir = (Join-Path $env:USERPROFILE '.nba-loader')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$LoaderDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$VenvDir   = Join-Path $StateDir 'venv'
$VenvPy    = Join-Path $VenvDir 'Scripts\python.exe'
$ConfigPath = Join-Path $StateDir 'config.ps1'

New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $StateDir 'logs') | Out-Null

if (-not (Test-Path $VenvPy)) {
    Write-Host "Creating virtualenv at $VenvDir ..."
    python -m venv $VenvDir
    if ($LASTEXITCODE -ne 0) { throw "venv creation failed (exit $LASTEXITCODE)" }
} else {
    Write-Host "Virtualenv already present at $VenvDir"
}

Write-Host "Installing pinned dependencies ..."
& $VenvPy -m pip install --quiet --upgrade pip
& $VenvPy -m pip install --quiet -r (Join-Path $LoaderDir 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw "dependency install failed (exit $LASTEXITCODE)" }

& $VenvPy -m pip --version | Out-Null
Write-Host "Installed:"
& $VenvPy -m pip list --format=freeze | Select-String -Pattern '^(nba_api|nba-api|pandas|numpy|requests|psycopg2)' | ForEach-Object { "  $_" }

if (-not (Test-Path $ConfigPath)) {
    Copy-Item (Join-Path $LoaderDir 'config.example.ps1') $ConfigPath
    Write-Host ""
    Write-Host "Created $ConfigPath"
    Write-Host "  -> EDIT IT and replace REPLACE_ME with the nba_app password." -ForegroundColor Yellow
} else {
    Write-Host "Config already exists at $ConfigPath (left untouched)"
}

# The config holds a database password in plaintext, which is the normal way to
# do this on a single-user Windows box -- but only if other accounts cannot read
# it. Strip inheritance and grant this user alone.
try {
    $acl = Get-Acl $ConfigPath
    $acl.SetAccessRuleProtection($true, $false)
    $acl.Access | ForEach-Object { $acl.RemoveAccessRule($_) | Out-Null }
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        "$env:USERDOMAIN\$env:USERNAME", 'FullControl', 'Allow')
    $acl.AddAccessRule($rule)
    Set-Acl -Path $ConfigPath -AclObject $acl
    Write-Host "Locked $ConfigPath down to $env:USERNAME only."
} catch {
    Write-Warning "Could not tighten permissions on $ConfigPath : $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Setup complete. Next:"
Write-Host "  1. Put the password in $ConfigPath"
Write-Host "  2. Test it:     .\run_refresh.ps1"
Write-Host "  3. Schedule it: .\register_task.ps1"
