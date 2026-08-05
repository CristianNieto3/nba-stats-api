# Security Notes

Review date: June 22, 2026

## Risks found and fixes made

### Committed PostgreSQL password

The original `application.properties` contained a plaintext PostgreSQL password. It was removed and replaced with `DB_PASSWORD`.

Because the old value remains in Git history, treat it as exposed:

1. Change the PostgreSQL password.
2. Update the local `.env`.
3. If this repository was ever pushed remotely, consider removing the secret from history after rotating it.

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

No custom security scanner is configured. Dependency vulnerability scanning should be added to CI before deployment, for example Dependabot/Renovate plus an SCA scanner. Major framework upgrades were intentionally not made as part of this cleanup.

## Remaining recommendations

Before public production deployment:

1. Rotate the previously committed database password.
2. Use a least-privileged PostgreSQL application user rather than a database superuser.
3. Serve over HTTPS before enabling writes remotely, since Basic credentials are only encoded, not encrypted.
4. Replace the single in-memory admin account with real user management if more than one operator ever needs access.
5. Add rate limiting at the reverse proxy or API gateway.
6. Use Flyway or Liquibase for versioned schema migrations.
7. Add dependency vulnerability scanning and automated update PRs.
8. Configure secure secret storage, production logging, and database backups at the hosting layer.
9. Review whether the bundled CSV should remain packaged in the production artifact.

## Data import

The repository does not contain the Python `nba_api` importer mentioned in the original README. The bundled CSV is static. Any future importer should use environment-based credentials, explicit target environments, transactions, and safeguards against overwriting production data.
