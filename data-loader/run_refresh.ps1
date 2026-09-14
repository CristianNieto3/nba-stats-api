<#
.SYNOPSIS
    Runs the NBA player refresh against Supabase, then verifies what landed.

.DESCRIPTION
    This is the entry point Task Scheduler calls. It exists rather than pointing
    the task straight at python.exe because a scheduled task that just runs a
    script is silent by construction: nobody watches Task Scheduler's "Last Run
    Result" column. This wrapper turns every outcome into something that leaves
    a trace -- a timestamped log, a status file, a non-zero exit code, and
    optionally a dead-man's-switch ping that emails you when a run fails OR
    never happens at all.

    Credentials are never stored in this repository. They live in a config file
    outside it (default: %USERPROFILE%\.nba-loader\config.ps1), which this
    script dot-sources.

.PARAMETER ConfigPath
    Path to the PowerShell config file that sets the NBA_DB_* environment
    variables. Defaults to %USERPROFILE%\.nba-loader\config.ps1.
#>
[CmdletBinding()]
param(
    [string]$ConfigPath = (Join-Path $env:USERPROFILE '.nba-loader\config.ps1')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Player names carry accents (Doncic, Jokic, Porzingis). Without this the loader's
# UTF-8 stdout gets reinterpreted as the console codepage and the log fills with
# mojibake -- or worse, the pipe errors out partway through the alphabet.
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch { }

$LoaderDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$StateDir  = Split-Path -Parent $ConfigPath
$LogDir    = Join-Path $StateDir 'logs'
$VenvPy    = Join-Path $StateDir 'venv\Scripts\python.exe'
$StatusFile = Join-Path $StateDir 'LAST_RUN.txt'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$startedAt = Get-Date
$LogFile = Join-Path $LogDir ("refresh_{0:yyyy-MM-dd_HHmmss}.log" -f $startedAt)

$script:Outcome = 'FAIL'
$script:Detail  = 'did not complete'
$script:RowsBefore = 'unknown'
$script:RowsAfter  = 'unknown'

function Write-Step {
    param([string]$Message)
    Write-Output ("[{0:HH:mm:ss}] === {1}" -f (Get-Date), $Message)
}

function Invoke-Healthcheck {
    param([string]$Suffix = '', [string]$Body = '')
    # Opt-in. Set NBA_HEALTHCHECK_URL in the config file to a healthchecks.io
    # (or equivalent) ping URL. Without it, a run that never fires is invisible;
    # with it, the service emails you when the expected ping does not arrive.
    if (-not $env:NBA_HEALTHCHECK_URL) { return }
    $url = $env:NBA_HEALTHCHECK_URL.TrimEnd('/') + $Suffix
    try {
        if ($Body) {
            Invoke-RestMethod -Uri $url -Method Post -Body $Body -TimeoutSec 20 | Out-Null
        } else {
            Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 20 | Out-Null
        }
    } catch {
        Write-Output "  (healthcheck ping to $Suffix failed: $($_.Exception.Message))"
    }
}

try {
    Start-Transcript -Path $LogFile -Force | Out-Null

    Write-Step "NBA player refresh starting"
    Write-Output "  loader dir : $LoaderDir"
    Write-Output "  config     : $ConfigPath"
    Write-Output "  log        : $LogFile"

    if (-not (Test-Path $ConfigPath)) {
        throw "Config file not found at $ConfigPath. Copy config.example.ps1 there and fill in the password."
    }
    if (-not (Test-Path $VenvPy)) {
        throw "Virtualenv python not found at $VenvPy. Run setup_venv.ps1 first."
    }

    Write-Step "Loading config"
    . $ConfigPath

    $required = @('NBA_DB_HOST', 'NBA_DB_PORT', 'NBA_DB_NAME', 'NBA_DB_USER', 'NBA_DB_PASSWORD')
    $missing = @($required | Where-Object { -not (Get-Item "env:$_" -ErrorAction SilentlyContinue) })
    if ($missing.Count -gt 0) {
        throw "Config did not set: $($missing -join ', ')"
    }
    Write-Output "  host=$env:NBA_DB_HOST port=$env:NBA_DB_PORT db=$env:NBA_DB_NAME user=$env:NBA_DB_USER"
    Write-Output "  password: set ($($env:NBA_DB_PASSWORD.Length) chars, not logged)"

    # The direct Supabase host is IPv6-only and silently unusable from most
    # networks. Catch that here with a clear message rather than as a mystery
    # timeout inside psycopg2.
    if ($env:NBA_DB_HOST -like 'db.*.supabase.co') {
        throw "NBA_DB_HOST is the direct host, which is IPv6-only. Use the session pooler host instead (aws-N-<region>.pooler.supabase.com)."
    }

    Invoke-Healthcheck -Suffix '/start'

    Write-Step "Counting rows before the load"
    $script:RowsBefore = (& $VenvPy (Join-Path $LoaderDir 'verify_player_table.py') --print-count) | Select-Object -Last 1
    if ($LASTEXITCODE -ne 0) { throw "Could not read the current row count (exit $LASTEXITCODE). Database unreachable?" }
    Write-Output "  rows before: $script:RowsBefore"
    $seasonBefore = (& $VenvPy (Join-Path $LoaderDir 'verify_player_table.py') --print-season) | Select-Object -Last 1
    if ($LASTEXITCODE -ne 0) { throw "Could not read the current season (exit $LASTEXITCODE)." }
    Push-Location $LoaderDir
    try {
        $targetSeason = & $VenvPy -c 'from load_nba_players import get_current_nba_season_start_year; print(get_current_nba_season_start_year())'
        if ($LASTEXITCODE -ne 0) { throw "Could not determine the target season." }
    } finally { Pop-Location }
    Write-Output "  season before: $seasonBefore; target: $targetSeason"

    Write-Step "Running the loader"
    & $VenvPy (Join-Path $LoaderDir 'load_nba_players.py')
    if ($LASTEXITCODE -eq 3) {
        $script:Outcome = 'SKIP'
        $script:Detail = "season not started; kept $seasonBefore ($script:RowsBefore rows)"
        Write-Step $script:Detail
    } else {
        if ($LASTEXITCODE -ne 0) { throw "Loader exited $LASTEXITCODE. The table was rolled back and is unchanged." }

        Write-Step "Verifying what actually landed"
        $verifyArgs = @('--expect-season', $targetSeason)
        if ($seasonBefore -eq $targetSeason) { $verifyArgs += @('--min-rows', $script:RowsBefore) }
        & $VenvPy (Join-Path $LoaderDir 'verify_player_table.py') @verifyArgs
        if ($LASTEXITCODE -ne 0) { throw "Post-load verification failed (exit $LASTEXITCODE)." }

        $script:RowsAfter = (& $VenvPy (Join-Path $LoaderDir 'verify_player_table.py') --print-count) | Select-Object -Last 1
        if ($LASTEXITCODE -ne 0) { throw "Could not read the post-load row count (exit $LASTEXITCODE)." }

        $script:Outcome = 'OK'
        $script:Detail  = "rows $script:RowsBefore -> $script:RowsAfter"
        Write-Step "Refresh succeeded ($script:Detail)"
    }
}
catch {
    $script:Outcome = 'FAIL'
    $script:Detail  = $_.Exception.Message
    Write-Output ""
    Write-Output "=============================================================="
    Write-Output "REFRESH FAILED: $script:Detail"
    Write-Output "The player table is unchanged -- the loader wraps DELETE+INSERT"
    Write-Output "in a single transaction and rolls back on any error."
    Write-Output "=============================================================="
    Write-Output $_.ScriptStackTrace
}
finally {
    $duration = (Get-Date) - $startedAt
    try { Stop-Transcript | Out-Null } catch { }

    $status = @(
        "$script:Outcome"
        "when     : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')"
        "duration : $([int]$duration.TotalSeconds)s"
        "detail   : $script:Detail"
        "log      : $LogFile"
    ) -join [Environment]::NewLine
    Set-Content -Path $StatusFile -Value $status -Encoding utf8

    if ($script:Outcome -in @('OK', 'SKIP')) {
        Invoke-Healthcheck
    } else {
        $tail = ''
        if (Test-Path $LogFile) {
            $tail = (Get-Content $LogFile -Tail 40 -ErrorAction SilentlyContinue) -join "`n"
        }
        Invoke-Healthcheck -Suffix '/fail' -Body $tail
    }

    # Keep a month of logs. Enough to spot a pattern, not enough to matter.
    Get-ChildItem $LogDir -Filter 'refresh_*.log' -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
        Remove-Item -Force -ErrorAction SilentlyContinue
}

if ($script:Outcome -eq 'FAIL') { exit 1 }
exit 0
