# NBA Player Stats Hub — dashboard

Next.js App Router frontend for the [NBA Player Stats Hub](../README.md) API.
TypeScript, Tailwind CSS, and the Barlow font families self-hosted through
[`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts).

Deployed to Vercel at https://nba-stats-hub-six.vercel.app

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Overview: league-wide highlights and entry points |
| `/players` | Roster explorer with search, filters, sorting, and pagination |
| `/players/[id]` | Single-player detail |
| `/leaders` | Leaderboards per statistic |
| `/compare` | Side-by-side comparison of two players |
| `/manage` | Admin-authenticated create, update, and delete |

`/manage` requires HTTP Basic credentials, and the backend only accepts writes
when `APP_WRITE_ENABLED=true`.

## Running locally

```bash
npm install
npm run dev
```

The dashboard starts at `http://localhost:3000`, which matches the backend's
default CORS origin. It expects the API at `http://localhost:8080`, so start the
Spring Boot service first — see the [root README](../README.md#run-the-backend).

```bash
npm run build     # production build
npm run lint      # ESLint
```

## Configuration

Set `NEXT_PUBLIC_API_BASE_URL` to the Spring Boot API base URL without a
trailing slash, in `.env.local` for development or in the Vercel project
settings for deployments.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080` | Base URL of the Spring Boot API |

It must be a valid HTTP(S) URL and must be available at **build** time, not just
at runtime: Next.js inlines `NEXT_PUBLIC_*` values into the bundle, and this
one's origin is also compiled into the Content Security Policy. Changing it
requires a rebuild.

## Security headers

`next.config.ts` sends an enforced Content Security Policy plus
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and
`Permissions-Policy` on every response, and disables the `X-Powered-By` header.

The policy allows browser connections only to the dashboard's own origin and the
configured API origin; framing, plugins, and inline event handlers are blocked
outright. Inline scripts and styles stay allowed, because statically rendered
Next.js pages need them — a nonce-based policy would force every page to render
dynamically. `unsafe-eval` and WebSocket origins are added by the development
server only and are absent from production builds.
