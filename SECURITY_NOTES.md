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

POST, PUT, and DELETE remain available for local compatibility but can be disabled with `APP_WRITE_ENABLED=false`. The production profile disables them.

This flag is not authentication. If remote write access is needed later, protect it with real admin authentication and authorization.

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
3. Keep write operations disabled or add admin authentication and authorization.
4. Add rate limiting at the reverse proxy or API gateway.
5. Use Flyway or Liquibase for versioned schema migrations.
6. Add dependency vulnerability scanning and automated update PRs.
7. Configure HTTPS, secure secret storage, production logging, and database backups at the hosting layer.
8. Review whether the bundled CSV should remain packaged in the production artifact.

## Data import

The repository does not contain the Python `nba_api` importer mentioned in the original README. The bundled CSV is static. Any future importer should use environment-based credentials, explicit target environments, transactions, and safeguards against overwriting production data.
