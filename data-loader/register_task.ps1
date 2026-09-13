<#
.SYNOPSIS
    Registers (or re-registers) the daily NBA refresh as a Windows scheduled task.

.DESCRIPTION
    Runs daily. The season being over does not make a daily run pointless: the
    run is what proves the whole path -- NBA endpoint, pooler, credentials,
    guard, verifier -- still works. A pipeline that only wakes up in October is
    a pipeline that discovers its breakage in October.

    Deliberate settings, and why:
      StartWhenAvailable      laptops are off at 06:30; without this a missed
                              run is simply skipped forever.
      Interactive logon       avoids storing your Windows password in Task
                              Scheduler and avoids needing admin to register.
                              Cost: the task runs only while you are logged on,
                              which StartWhenAvailable largely compensates for.
      Battery settings        the default is to refuse to start on battery and
                              to kill a running task when the charger comes out.
      ExecutionTimeLimit      a hung stats.nba.com request should not leave a
                              python process alive indefinitely.
      Headless console        the action starts PowerShell through
                              `conhost.exe --headless`. Otherwise an Interactive
                              task opens a visible console (a Windows Terminal
                              tab on Windows 11), and closing it or pressing
                              Ctrl+C kills the run with 0xC000013A before
                              LAST_RUN.txt is written. Runs failed exactly
                              that way from 2026-08-29 to 2026-09-13. Stopping
                              the task through Task Scheduler reports
                              0x00041306 instead, so the code identifies a
                              console event.

.PARAMETER Time
    Local time to run daily. Default 06:30, comfortably after even the latest
    West Coast game has gone final.

.PARAMETER Unregister
    Remove the task instead of creating it.
#>
[CmdletBinding()]
param(
    [string]$TaskName = 'NBA stats daily refresh',
    [string]$Time = '06:30',
    [switch]$Unregister
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$LoaderDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$Runner    = Join-Path $LoaderDir 'run_refresh.ps1'

if ($Unregister) {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "Removed scheduled task '$TaskName'."
    } else {
        Write-Host "No scheduled task named '$TaskName'."
    }
    return
}

if (-not (Test-Path $Runner)) { throw "run_refresh.ps1 not found next to this script ($Runner)" }

$PowerShellExe = Join-Path $PSHOME 'powershell.exe'
$action = New-ScheduledTaskAction `
    -Execute (Join-Path $env:SystemRoot 'System32\conhost.exe') `
    -Argument "--headless `"$PowerShellExe`" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$Runner`"" `
    -WorkingDirectory $LoaderDir

$trigger = New-ScheduledTaskTrigger -Daily -At $Time

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description 'Refreshes the player table in Supabase from stats.nba.com. Logs to %USERPROFILE%\.nba-loader\logs.' `
    -Force | Out-Null

Write-Host "Registered '$TaskName', daily at $Time."
Write-Host ""
Write-Host "Run it now to check:"
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Then:"
Write-Host "  Get-Content `"$env:USERPROFILE\.nba-loader\LAST_RUN.txt`""
