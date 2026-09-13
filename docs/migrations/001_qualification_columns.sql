-- Volume columns behind the NBA leaderboard qualification rules.
--
-- Until this runs, the player table holds percentages and nothing else, so
-- nothing downstream can tell a 1-for-1 three-point season from a 200-for-500
-- one; both are just three_pt_percent. These columns carry the makes, attempts,
-- and games the rules at https://www.nba.com/stats/help/statminimums are
-- written in terms of.
--
-- ORDER OF OPERATIONS. spring.jpa.hibernate.ddl-auto is `validate`, so the API
-- refuses to start when the entity declares a field the table does not have.
-- Run this against Supabase BEFORE deploying the backend that reads it.
--
-- The DEFAULT 0 is what makes that ordering safe in the other direction: the
-- 516 existing rows get zeros, a zeroed table prorates every threshold to 0,
-- and every player qualifies. The API therefore behaves exactly as it does
-- today until the loader next runs on a machine stats.nba.com will talk to.

ALTER TABLE player
    ADD COLUMN IF NOT EXISTS games_played INTEGER          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fgm          INTEGER          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fga          INTEGER          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fg3m         INTEGER          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fg3a         INTEGER          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ftm          INTEGER          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fta          INTEGER          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ft_percent   DOUBLE PRECISION NOT NULL DEFAULT 0;
