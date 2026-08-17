# Security Notes

Original review: June 22, 2026. Last updated: August 17, 2026.

## Risks found and fixes made

### Committed PostgreSQL password

The original `application.properties` contained a plaintext PostgreSQL password
for a local development database. It was removed and replaced with
`DB_PASSWORD`, and the value has since been purged from Git history with
`git filter-repo --replace-text`, so no commit in this repository contains it.

Two caveats worth stating rather than hiding:

- A force-push does not delete the pre-rewrite objects on the hosting side.
  They stay reachable by exact commit SHA until the host garbage-collects them,
  which for GitHub means opening a support request.
- Anyone who cloned before the rewrite still has the old history locally.

For both reasons the credential is treated as exposed. Rotation, not the scrub,
is what actually revokes it; the scrub only stops it spreading further.

### Permissive CORS

The controller allowed every origin. CORS is now centrally configured through `CORS_ALLOWED_ORIGINS`, with `http://localhost:3000` as the local default. The production profile requires an explicit origin.

### Public write operations

POST, PUT, and DELETE now require HTTP Basic authentication as an admin. Anonymous callers get `401` and authenticated non-admins get `403`. `GET` stays public, which is the point of a stats dashboard.

`APP_WRITE_ENABLED` still exists and is unchanged. The two controls answer different questions: the flag decides whether the write endpoints respond at all, authentication decides who may call them. Disabling the flag remains the stronger option because it removes the surface entirely.

Details worth knowing:

- The credential comes from `ADMIN_USERNAME` and `ADMIN_PASSWORD`. There is deliberately no default password. If it is unset the application still starts, but an unusable random value is installed, so a misconfigured deployment fails closed rather than exposing a known login.
- The password is held only as a BCrypt hash in memory. It is never written to disk or logged.
- The API is stateless and re-authenticates each request from the `Authorization` header, so no session cookie exists. CSRF protection is therefore disabled: without a cookie there is nothing for a hostile page to ride on, and a token requirement would only break non-browser clients.
- Basic authentication sends credentials base64-encoded, not encrypted. It is only safe over HTTPS, which still needs to be terminated at the hosting layer.
- This is a single hardcoded account, not user management. There are no roles beyond admin, no password rotation, no lockout, and no audit trail.

### Unsafe runtime defaults

- Hibernate schema management now defaults to `validate`, not `update`.
- SQL logging defaults to off.
- Open Session in View is disabled.
- Framework error messages and stack traces are not included in responses.
- Database and unexpected exceptions return sanitized messages while details remain in server logs.

### Missing input bounds

Request bodies and query parameters now reject:

- blank required strings
- invalid positions
- negative statistics
- percentages outside 0 through 100
- unreasonable seasons
- non-positive IDs and limits
- page sizes above 100
- unsupported sort fields and directions

### Query safety

Filtering uses JPA Criteria predicates, derived repository methods, and an explicit sort-field allowlist. No request value is concatenated into SQL or JPQL.

### Unsafe update and delete behavior

Updates and deletes now verify that a player exists and return 404 otherwise. Update IDs use the path as the canonical source, avoiding accidental entity insertion or mass assignment.

## Dependency review

The project uses Spring Boot dependency management and has a small dependency set:

- Spring Web
- Spring Data JPA
- Jakarta Validation
- PostgreSQL JDBC
- H2 for tests/runtime
- Spring Boot test tooling

Dependency scanning is now in place on two levels: Dependabot raises advisories
against the repository, and CI fails a build on any high or critical npm
advisory (`npm audit --audit-level=high`). Moderate and below are left to
Dependabot so routine noise cannot block a merge.

Major framework upgrades were intentionally not made as part of the original
cleanup, though Next.js has since been moved to 16.3.1 to clear six transitive
advisories in `postcss`, `nanoid` and `sharp`.

## Recommendations

### Addressed since the original review

- The previously committed database password has been purged from Git history.
- The data loader connects through a dedicated `nba_app` role rather than the
  `postgres` superuser. Worth confirming the API's own `DB_USERNAME` is set to
  the same least-privileged role.
- Both services are served over HTTPS by their hosting platforms, so Basic
  credentials are not sent in the clear.
- Dependency scanning runs in CI and through Dependabot.
- Secrets are held as platform environment variables (Render, Vercel) and, for
  the loader, in a file outside the repository tree.

### Still open

1. Rotate the previously committed password anywhere it may have been reused.
   The scrub removes it from history; only rotation revokes it.
2. Rate limiting or lockout in front of the HTTP Basic write endpoints. There is
   currently nothing to slow a brute-force attempt, and `render.yaml` publishes
   the admin username.
3. Real user management, if more than one operator ever needs access.
4. Versioned schema migrations with Flyway or Liquibase.
5. Application-level security headers and a Content Security Policy. Both
   currently rely on platform defaults.
6. Production logging and database backups at the hosting layer.
7. Review whether the bundled CSV should ship inside the production artifact.

## Data import

`data-loader/` now contains the Python `nba_api` importer; the bundled CSV
remains as a static 12-row fixture. The loader reads its credentials from
`%USERPROFILE%\.nba-loader\config.ps1`, outside the repository tree, and
`.gitignore` blocks the in-repo paths a stray copy would land on. It verifies
the row count after each load and refuses to commit a run that drops the table
below a floor, so a partial fetch cannot silently empty production.

It runs on a local scheduled task rather than in CI because `stats.nba.com`
blocks datacenter IP ranges, so a hosted runner cannot reach it at all.
