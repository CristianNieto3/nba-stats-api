# NBA Player Stats Hub API

Spring Boot REST API for retrieving, searching, filtering, sorting, comparing, and maintaining NBA player statistics. This repository currently contains the backend only.

## Tech stack

- Java 21
- Spring Boot 3.4
- Spring Web, Spring Data JPA, and Jakarta Bean Validation
- PostgreSQL
- Maven Wrapper
- H2 for automated tests

## Project layout

The runnable Maven project is in `nbastats/`.

```text
nbastats/
  src/main/java/com/cristian/nbastats/
    config/       CORS configuration
    error/        Consistent API error handling
    player/       Player controller, service, repository, entity, and DTOs
  src/main/resources/
    application.properties
    application-prod.properties
    nba_players.csv
```

## Requirements

- Java 21
- PostgreSQL
- A PostgreSQL database named `nba`

## Configuration

Copy the example environment file:

```powershell
cd nbastats
Copy-Item .env.example .env
```

Update `.env` with your local database password. Spring imports this file when the application starts from the `nbastats` directory. `.env` is ignored by Git.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/nba` | PostgreSQL JDBC URL |
| `DB_USERNAME` | `postgres` | Database username |
| `DB_PASSWORD` | none | Database password |
| `JPA_DDL_AUTO` | `validate` | Hibernate schema behavior |
| `JPA_SHOW_SQL` | `false` | SQL logging |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated frontend origins |
| `APP_WRITE_ENABLED` | `true` | Enables POST, PUT, and DELETE locally |

Do not commit `.env`. For production, set real environment variables or secrets through the hosting platform.

## PostgreSQL setup

Create the database:

```sql
CREATE DATABASE nba;
```

The existing project expects this table:

```sql
CREATE TABLE IF NOT EXISTS player (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    team VARCHAR(10) NOT NULL,
    position VARCHAR(10) NOT NULL,
    ppg DOUBLE PRECISION NOT NULL,
    rpg DOUBLE PRECISION NOT NULL,
    apg DOUBLE PRECISION NOT NULL,
    fg_percent DOUBLE PRECISION NOT NULL,
    three_pt_percent DOUBLE PRECISION NOT NULL,
    season INTEGER NOT NULL
);
```

For an empty local database, you may temporarily set `JPA_DDL_AUTO=update` for the first startup. Return it to `validate` afterward.

## Importing the bundled sample data

The repository includes `src/main/resources/nba_players.csv` with 12 sample records. From `nbastats/`, import it with PostgreSQL's `psql` client:

```powershell
psql -U postgres -d nba -c "\copy player(id,name,team,position,ppg,rpg,apg,fg_percent,three_pt_percent,season) FROM 'src/main/resources/nba_players.csv' WITH (FORMAT csv, HEADER true)"
```

If explicit IDs are imported, synchronize the identity sequence:

```sql
SELECT setval(pg_get_serial_sequence('player', 'id'), COALESCE(MAX(id), 1)) FROM player;
```

No Python `nba_api` import script is currently present in this repository.

## Run the backend

```powershell
cd nbastats
.\mvnw.cmd spring-boot:run
```

The API starts at `http://localhost:8080`. Verify it with:

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/players
```

## Run tests and build

Tests use an isolated in-memory H2 database:

```powershell
cd nbastats
.\mvnw.cmd test
.\mvnw.cmd clean verify
```

## API endpoints

All routes use the base path `/api/v1/players`.

| Method | Route | Description |
| --- | --- | --- |
| GET | `/` | Get all players; retained for compatibility |
| GET | `/{id}` | Get one player by ID |
| GET | `/page` | Paginated filtering, searching, and sorting |
| GET | `/filter` | Legacy unpaginated filters |
| GET | `/name/{name}` | Partial, case-insensitive name search |
| GET | `/search?query=...` | Up to 10 names for autocomplete |
| GET | `/team/{team}` | Filter by team |
| GET | `/position/{position}` | Filter by position |
| GET | `/minPpg?minPpg=20` | Filter by minimum PPG |
| GET | `/top-scorers?limit=10` | Top players by PPG |
| GET | `/compare?name1=...&name2=...` | Retrieve two exact-name matches |
| GET | `/leaders/{stat}?limit=5` | Leaders for a supported statistic |
| POST | `/` | Create a player when writes are enabled |
| PUT | `/{id}` | Update a player when writes are enabled |
| PUT | `/` | Legacy update; requires `id` in the body |
| DELETE | `/{id}` | Delete a player when writes are enabled |

### Pagination and filtering

Example:

```text
GET /api/v1/players/page?team=LAL&minPpg=20&page=0&size=10&sortBy=ppg&direction=desc
```

Supported filters:

- `name`, `team`, and `position`
- `minPpg`, `minRpg`, `minApg`, `minFg`, and `minThreePt`
- `page` is zero-based
- `size` must be from 1 through 100

Supported sort fields:

- `name`, `team`, `position`, `season`
- `ppg`, `rpg`, `apg`
- `fgPercent` or `fg_percent`
- `threePtPercent` or `three_pt_percent`

Supported leaderboard statistics are `ppg`, `rpg`, `apg`, `fgPercent`, and `threePtPercent`. Snake-case percentage aliases are also accepted.

### Player request example

```json
{
  "name": "Stephen Curry",
  "team": "GSW",
  "position": "PG",
  "ppg": 29.7,
  "rpg": 5.4,
  "apg": 6.1,
  "fg_percent": 49.4,
  "three_pt_percent": 42.1,
  "season": 2023
}
```

Names and teams cannot be blank, stats cannot be negative, percentages must be between 0 and 100, and positions must use NBA position abbreviations.

### Error response example

```json
{
  "timestamp": "2026-06-22T12:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Request validation failed.",
  "path": "/api/v1/players",
  "fieldErrors": {
    "name": "name is required"
  }
}
```

## Production profile

Start with the production profile using:

```powershell
$env:SPRING_PROFILES_ACTIVE = "prod"
.\mvnw.cmd spring-boot:run
```

The production profile disables write operations and requires `CORS_ALLOWED_ORIGINS` to be set. If production writes are eventually needed, add authentication and authorization before enabling them.

## Security and limitations

- Public GET endpoints are intentional for a stats dashboard.
- Write endpoints have no authentication. Keep `APP_WRITE_ENABLED=false` outside trusted development environments.
- CORS is restricted to configured origins and does not allow credentials.
- Query sorting uses an allowlist, and filtering uses parameterized JPA Criteria queries.
- Database credentials are no longer stored in source control.
- There is no rate limiting, authentication, database migration tool, or automated data-refresh job yet.

See [SECURITY_NOTES.md](SECURITY_NOTES.md) for the detailed review.
