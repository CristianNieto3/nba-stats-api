# data-loader

Rebuilds the `player` table in Supabase from `stats.nba.com`. One run costs
~32 HTTP requests (two `LeagueDashPlayerStats` plus 30 `CommonTeamRoster`) and
takes about two minutes.

The two `LeagueDashPlayerStats` calls request the same season twice, once in
`PerGame` mode for the rate stats and once in `Totals` mode for the makes,
attempts, and games played behind them. Totals could be recovered by multiplying
the per-game figures by `GP`, but the leaderboard minimums are counted in whole
made shots -- 82 threes, 300 field goals -- and multiplying a rounded average
puts players either side of that line. One extra league-wide request is cheap
next to the 30 roster calls already in the run.

> **Requires the volume columns.** This loader writes `games_played`, `fgm`,
> `fga`, `fg3m`, `fg3a`, `ftm`, `fta`, and `ft_percent`. Against a table that
> predates them the `INSERT` fails and the transaction rolls back, leaving the
> old data in place. Apply
> [`../docs/migrations/001_qualification_columns.sql`](../docs/migrations/001_qualification_columns.sql)
> first.

| File | Role |
|---|---|
| `load_nba_players.py` | The loader. `DELETE` + bulk `INSERT` in one transaction. |
| `verify_player_table.py` | Independent post-load check; reconnects and inspects what actually landed. |
| `run_refresh.ps1` | What the scheduled task runs: config, load, verify, log, alert. |
| `setup_venv.ps1` | One-time setup. Creates the venv and the config file. |
| `register_task.ps1` | Registers/removes the daily Windows scheduled task. |
| `config.example.ps1` | Template. **Never** holds a real password. |
| `requirements.txt` | Pinned dependencies. |

## Why this runs locally and not in CI

`stats.nba.com` blocks datacenter IP ranges. Measured from a GitHub Actions
runner, TCP connects and TLS 1.3 completes in 0.1s, then the HTTP request is
silently black-holed — three consecutive 60-second timeouts, on two different
endpoints, while `www.nba.com` returned HTTP 200 from the same runner. The same
request from a residential connection returns 200 in 1.2s.

This is not fixable with headers, retries, or backoff, so the schedule lives on
a machine with a residential IP. A self-hosted Actions runner would also work,
but this repository is public, and a self-hosted runner on a public repository
lets any fork's pull request execute code on the host.

## Setup

```powershell
cd data-loader
.\setup_venv.ps1                       # venv + config scaffold
notepad $env:USERPROFILE\.nba-loader\config.ps1   # paste the nba_app password
.\run_refresh.ps1                      # verify it works
.\register_task.ps1                    # schedule it daily at 06:30
```

Everything mutable lives in `%USERPROFILE%\.nba-loader\` — outside this
repository, so no credential can be committed by accident:

```
.nba-loader\
    venv\           pinned dependencies
    config.ps1      credentials, ACL'd to your account only
    logs\           one timestamped log per run, pruned after 30 days
    LAST_RUN.txt    OK/FAIL summary of the most recent run
```

## Connecting to Supabase

Use the **session pooler**, never the direct host:

```
host: aws-0-us-east-1.pooler.supabase.com
port: 5432
db:   postgres
user: nba_app.<project-ref>
```

`db.<project-ref>.supabase.co` is IPv6-only and will not resolve on most
networks. `run_refresh.ps1` rejects it with an explicit message rather than
letting it fail as a mystery timeout.

`nba_app` is least-privileged: `SELECT/INSERT/UPDATE/DELETE` on `player` only.
It has no `TRUNCATE`, which is why the loader uses `DELETE`.

## How a bad run is caught

The project has already been burned once by an import that committed after
per-record failures and reported success while dropping a third of the league.
Four independent things now have to agree before a refresh is considered good:

1. **The loader's roster guard.** More than 2 of 30 team rosters failing aborts
   the run, rather than importing players without positions.
2. **The loader's shrink guard.** If the new table would be under 90% of the
   previous row count, it raises and rolls back.
3. **`verify_player_table.py`.** Reconnects from scratch after the commit and
   checks the row count against an absolute floor of 300, checks it did not
   shrink more than 10%, checks every row carries the expected season, and
   checks no row has an empty name. The absolute floor matters because guard 2
   is vacuous when the previous count is 0 — `0 < 0 * 0.9` is false, so an
   empty table would otherwise accept anything.
4. **`run_refresh.ps1`.** Any non-zero exit becomes a `FAIL` in `LAST_RUN.txt`,
   a non-zero task result, and a `/fail` ping with the last 40 log lines.

Because the loader wraps `DELETE` + `INSERT` in a single transaction, a failure
at any point leaves the existing table untouched. The failure mode is stale
data, never partial data.

### The one gap a log file cannot close

A scheduled task fails quietly in two ways: the run errors, or the run never
happens because the laptop was off. Logs catch the first and miss the second
entirely — and "no log" looks exactly like "nothing to report".

Set `NBA_HEALTHCHECK_URL` in `config.ps1` to a free [healthchecks.io](https://healthchecks.io)
ping URL to close it. The script pings `/start` before, the bare URL on success,
and `/fail` with a log tail on failure; the service emails you when an expected
ping does not arrive. Without it, a laptop that stays shut for a week is
indistinguishable from a week of successful runs.

## Cadence

Daily at 06:30 local, after even the latest West Coast game has gone final.

Daily is deliberate even though the season is over and the data is frozen until
around October 2026. The value of an off-season run is not the data — it is the
proof that the endpoint, the pooler, the credentials, and the guards all still
work. A pipeline that only wakes up in October is a pipeline that discovers its
breakage in October.

**Expect noise at the season rollover.** On 1 October 2026 the loader starts
requesting season `2026-27`, which has no games until roughly 21 October.
`LeagueDashPlayerStats` will return nothing usable, the shrink guard will fire,
and the run will fail loudly every day for about three weeks. The data stays
safe throughout — but if the daily failure mail gets annoying, that is the thing
to fix, not the schedule.

## Manual operation

```powershell
.\run_refresh.ps1                                   # run now
Get-Content $env:USERPROFILE\.nba-loader\LAST_RUN.txt
Start-ScheduledTask -TaskName 'NBA stats daily refresh'
Get-ScheduledTaskInfo -TaskName 'NBA stats daily refresh'
.\register_task.ps1 -Unregister                     # remove the schedule
.\register_task.ps1 -Time 07:15                     # change the time
```
