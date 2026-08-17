# Template for the NBA loader's credentials.
#
#   COPY THIS FILE to %USERPROFILE%\.nba-loader\config.ps1 and fill in the
#   password there. Do NOT put the real password in this file -- this one is
#   committed and the repository is going public.
#
# setup_venv.ps1 copies it into place for you and locks the permissions down.

# Supabase SESSION POOLER, not the direct host. db.<ref>.supabase.co is
# IPv6-only and will not connect from most networks.
$env:NBA_DB_HOST = 'aws-0-us-east-1.pooler.supabase.com'
$env:NBA_DB_PORT = '5432'
$env:NBA_DB_NAME = 'postgres'

# Least-privileged role: SELECT/INSERT/UPDATE/DELETE on `player` and nothing
# else. Note the pooler requires the <role>.<project-ref> form.
$env:NBA_DB_USER = 'nba_app.fnynmzeqyobuhrgurfgc'

# ---------------------------------------------------------------------------
# Paste the nba_app password from your password manager between the quotes.
# ---------------------------------------------------------------------------
$env:NBA_DB_PASSWORD = 'REPLACE_ME'

# ---------------------------------------------------------------------------
# Optional but strongly recommended: a dead-man's switch.
#
# A scheduled task on a laptop fails quietly in two different ways -- the run
# errors out, or the run never happens because the machine was off. A log file
# catches the first and misses the second. A healthcheck URL catches both:
# the service expects a ping on a schedule and emails you when one is late.
#
# Create a free check at https://healthchecks.io, set the period to 1 day with
# a grace window of a few hours, and paste its ping URL here. Leave it empty to
# disable pinging entirely.
# ---------------------------------------------------------------------------
$env:NBA_HEALTHCHECK_URL = ''
