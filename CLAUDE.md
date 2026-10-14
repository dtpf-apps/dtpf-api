# CLAUDE.md

> Ecosystem context: root `d-context/CLAUDE.md` (common stack + conventions, shared rules) and `docs/services/dtpf.es.md` (cross-sub-project service guide: portfolio + API coordination, deploy map). This file covers `dtpf-api` internals only.

## Project Overview

Backend for the dtpf.es personal portfolio website. Built with Node.js 24, Express 5, TypeScript 7, MongoDB (Mongoose 9) and Zod 4. Package manager: **pnpm**.

Serves as the **contact form API** — receives messages, stores in MongoDB, sends email notification via Stalwart Mail Server — plus the frontend error collector and the pre-built frontend itself.

## Commands

```bash
pnpm db              # Start local MongoDB Docker container (dtpf-mongodb, port 27019)
pnpm dev             # tsc --watch + node --watch (NODE_ENV=development, port 3998)
pnpm build           # Compile TypeScript to dist/
pnpm start           # Production server (NODE_ENV=production)
pnpm format          # Prettier over src/ and test/
pnpm format:check    # Fails on unformatted files (CI gate)
pnpm typecheck       # tsc over src/ + test/ (tsconfig.test.json, no emit; CI gate)
pnpm test            # Both Vitest projects (unit + e2e)
pnpm test:unit       # Unit project only
pnpm test:e2e        # E2E project only
pnpm test:watch      # Watch mode
pnpm test:coverage   # Both projects with v8 coverage + thresholds (what CI runs)
```

### Testing

Vitest 5 with globals and two projects in `vitest.config.mts`; coverage thresholds live there too, and CI runs `typecheck`, `format:check` and `test:coverage` before every deploy (Gitea Actions, `.gitea/workflows/deploy.yml`; GitHub only receives a read-only push mirror). Counts are not kept here: `pnpm test` prints them.

- **unit** — the pure pieces, each in isolation: config validation, schemas, rate limiter, error middleware, canonical host, security headers, the email service (nodemailer mocked) and the email template.
- **e2e** — the real Express app over HTTP with supertest against a real MongoDB: `globalSetup.ts` starts one `mongodb-memory-server` per run and provides its URI; `setup.ts` connects each file to its own database and drops it afterwards. Nothing in the request path is mocked except the email service boundary (`sendEmail`), so validation, anti-spam, cooldown, persistence, `trust proxy` keying and the JSON error shape are all exercised for real. The binary is downloaded on first run and cached under `~/.cache/mongodb-binaries`.

`vite` is a direct devDependency even though this backend compiles with `tsc` and never bundles. It arrives as vitest's own dependency across a three-major range, and an override cannot move a version the lockfile already pins — so declaring it directly is what actually decides which major the test toolchain runs on. It is dev-only and the deploy prunes it.

```
test/
├── helpers/mocks.ts                  # Typed res mock, unique contact bodies, unique caller IPs
├── config/config.test.ts             # Env validation: defaults, deployed requirements, SMTP TLS name
├── schemas/schemas.test.ts           # Contact + client-error payloads → error codes, clipping
├── utils/rateLimit.test.ts           # Sliding window, refused hits not counted, LRU eviction, sweep
├── middlewares/
│   ├── canonicalHost.test.ts         # www.<host> → 301 apex, every other host passes
│   ├── error.test.ts                 # Parser errors → codes, 4xx vs 5xx, headersSent
│   └── securityHeaders.test.ts       # CSP + security headers
├── services/
│   ├── email.test.ts                 # Transport options (STARTTLS, verified cert), retry, verify
│   └── emailTemplates.test.ts        # HTML generation, XSS escaping
└── e2e/
    ├── globalSetup.ts                # One in-memory MongoDB per run
    ├── setup.ts                      # Per-file database, dropped after
    ├── app.e2e.test.ts               # Health, no CORS, canonical host, JSON 404s, static client, 503
    ├── contact.e2e.test.ts           # Every anti-spam layer, validation codes, cooldown race, IP keying
    └── clientErrors.e2e.test.ts      # Validation, clipping, rate limit
```

Key patterns: a unit suite that needs a module boundary replaced uses `vi.hoisted()` for the mock variables its `vi.mock()` factory reads, and `vi.useFakeTimers()` for retry delays. E2E suites give every request its own caller IP (`nextCaller()` → `X-Forwarded-For`) and every contact its own email (`validContact()`), so the rate limiter and the cooldown never leak state between tests. `app.e2e.test.ts` points `CLIENT_DIR` (test-only override of the `client/` directory) at a throwaway fixture so the static block and the per-route HTML resolution run over real HTTP.

## Architecture

### Entry Flow

`src/config/config.ts` validates `process.env` with Zod at import. In development and test every variable has a local default; in staging and production every required variable must be present, and an `SMTP_HOST` given as an IP needs `SMTP_TLS_SERVERNAME` — startup throws and names what is missing. Behaviour derives from the validated config (`config.deployed`, `config.log.level`, `config.email.enabled`), never from comparing `NODE_ENV` strings in place, so staging behaves exactly like production.

`src/index.ts` connects to MongoDB, verifies the SMTP transporter (when SMTP credentials exist), starts Express, and shuts down gracefully on SIGTERM/SIGINT (server, transporter, MongoDB; forced exit after 10 s). An unhandled rejection or uncaught exception is logged as fatal and exits 1 so PM2 restarts a clean process.

`src/app.ts` sets `trust proxy` to 1, then: canonical host, compression, pino-http, security headers (incl. CSP), the JSON parser (16 kB), the routes under `/api/<version>`, the static client, a JSON 404 and the error middleware. Outside development it serves the frontend from `client/`: `/assets` with 1-year immutable cache, `/service-worker.js` with no-cache headers, and a catch-all that serves the route's pre-rendered `client/<route>/index.html` (the frontend build emits one per route with that page's title, description, Open Graph and canonical tags) when it exists, and otherwise the SPA shell with a **404 status** — every real page has a pre-rendered file, so a path without one is unknown; the client still renders its not-found page, and a crawler never indexes a mistyped URL as a copy of the home (the shell is the home's pre-rendered head). Unknown `/api/*` paths fall through to the JSON 404, never the shell. Every HTML response (static index, catch-all page, 404 shell) carries `Cache-Control: public, max-age=0, no-transform`: Cloudflare injects its Web Analytics beacon into the HTML it proxies, our CSP blocks that script (a console error per page, no analytics either way), and `no-transform` is the documented way an origin declines that edge rewriting. `canonicalHostMiddleware` runs first: Cloudflare and NPM forward `www.dtpf.es` to this same server, so a `www.` host gets a 301 to the apex instead of a second copy of the site.

### File Structure

```
src/
├── config/config.ts             # Env schema (Zod), deployed requirements, typed config
├── controllers/
│   ├── clientErrors.ts          # Rate limit → validate → log → 204
│   ├── contact.ts               # Anti-spam layers, validation, HTTP mapping
│   └── utils.ts                 # Health check: 200, or 503 without MongoDB
├── interfaces/
│   ├── contact.interface.ts
│   └── index.ts
├── middlewares/
│   ├── canonicalHost.middleware.ts    # 301 www.<host> → https://<host>, path and query kept
│   ├── error.middleware.ts            # Parser errors → codes; 4xx warn, 5xx error
│   ├── requireJson.middleware.ts      # 415 unless Content-Type is JSON
│   └── securityHeaders.middleware.ts  # CSP + nosniff/frame/referrer/permissions headers
├── models/
│   └── contact.ts               # Contact schema (limits from contact.schema.ts)
├── routers/
│   ├── clientErrors.ts          # POST /client-errors
│   ├── contact.ts               # POST /contact-me
│   └── utils.ts                 # GET /connection
├── schemas/
│   ├── clientError.schema.ts    # Error report payload; long fields clipped, not rejected
│   └── contact.schema.ts        # Contact payload, CONTACT_LIMITS, issue → error code
├── services/
│   ├── contact.service.ts       # Per-address cooldown (atomic per address), store, notify owner
│   ├── email.ts                 # Nodemailer SMTP with retry (Stalwart Mail Server)
│   ├── emailTemplates.ts        # Styled HTML email template (Ocean Teal design)
│   └── logger.ts                # Pino structured logging
├── utils/
│   ├── apiError.ts              # Error codes, Spanish fallback messages, sendError()
│   └── rateLimit.ts             # In-memory sliding-window limiter with LRU cap and sweep
├── app.ts
└── index.ts
```

### API Endpoints

| Method | Path                    | Auth   | Description                                   |
| ------ | ----------------------- | ------ | --------------------------------------------- |
| `POST` | `/api/v1/contact-me`    | Public | Submit contact form                           |
| `POST` | `/api/v1/client-errors` | Public | Report frontend errors (rate limited)         |
| `GET`  | `/api/v1/connection`    | Public | Health check: `200`, or `503` without MongoDB |

### Contact Request Pipeline (five anti-spam layers plus validation, in this order)

1. **Honeypot** — `website` field filled → the same `201` a real message gets, nothing stored
2. **Validation** — Zod schema → `400` with the first issue's code
3. **Time trap** — `_t` missing or < 3 s old → the same silent `201`
4. **Link limit** — more than 5 links → `400 too_many_links`
5. **IP rate limit** — 3/hour per `req.ip` (in-memory) → `429 rate_limited`
6. **Email cooldown** — 1 message per address per 24 h (MongoDB; an in-process set per address closes the check-then-insert race, valid while the API runs as a single PM2 process) → `429 email_cooldown`

A trapped bot gets exactly the answer a person gets: a different status or body would tell it which layer caught it.

### Email Notifications

When a contact form is submitted, the backend:

1. Saves to MongoDB
2. Sends styled HTML email to `NOTIFICATION_TO` without awaiting it (one retry; failures logged); skipped when `SMTP_USER` is empty
3. Sets `replyTo` to the sender's email for easy replies; the date is formatted in Europe/Madrid

The transporter always verifies the server certificate: STARTTLS is required on 587 (implicit TLS on 465), and `SMTP_TLS_SERVERNAME` names the certificate's host when `SMTP_HOST` is an IP.

Email template matches the dtpf.es visual identity (dark bg, Ocean Teal accents, card layout).

### Key Patterns

- **Error contract** — every error is `{ status, code, message }` via `sendError()` (`src/utils/apiError.ts`). `code` is the contract the web maps to its own i18n copy; `message` is a Spanish fallback. A `429` adds a `Retry-After` header and `retryAfter` (seconds). A new failure means a new code in `ERROR_MESSAGES`, never a free-text message.
- **Client IP** — `app.set('trust proxy', 1)`: the chain is Cloudflare → NPM → this app, NPM restores the visitor from `CF-Connecting-IP` (trusted only from Cloudflare ranges) and appends it to `X-Forwarded-For`, so `req.ip` is the one hop a caller cannot forge. Never key anything on the leftmost `X-Forwarded-For` entry or on `CF-Connecting-IP` directly: both are caller-controlled.
- **No CORS** — every deployed environment serves the client from this origin; local development goes through the Vite dev-server proxy. Adding CORS headers back would only widen who can post.
- **Request bodies** — JSON only (`requireJson` on every POST route), 16 kB cap; payload shapes live in `src/schemas/`, and the Mongoose model reads its limits from there.
- **Structured logging** via pino + pino-http (JSON). Level: `debug` in development, `info` deployed, `silent` in tests. Client-caused 4xx are `warn`, server faults `error`.

## Environment Variables

Defaults apply in development and test only; staging and production must set every variable marked required (startup refuses otherwise).

| Variable              | Required deployed | Development default | Description                                           |
| --------------------- | ----------------- | ------------------- | ----------------------------------------------------- |
| `NODE_ENV`            | yes (PM2 sets it) | `development`       | `development`, `test`, `staging` or `production`      |
| `API_VERSION`         | no                | `v1`                | API version prefix                                    |
| `PORT_SERVER`         | yes               | `3998`              | Express port                                          |
| `IP_MONGO_DB`         | yes               | `127.0.0.1`         | MongoDB host                                          |
| `PORT_MONGO_DB`       | yes               | `27019`             | MongoDB port                                          |
| `DB_NAME`             | yes               | `dtpf`              | Database name                                         |
| `SMTP_HOST`           | yes               | `localhost`         | Stalwart Mail Server host                             |
| `SMTP_PORT`           | no                | `587`               | SMTP submission port (465 = implicit TLS)             |
| `SMTP_USER`           | yes               | empty               | SMTP auth username (without domain); empty = no email |
| `SMTP_PASS`           | yes               | empty               | SMTP auth password                                    |
| `SMTP_TLS_SERVERNAME` | if host is an IP  | the SMTP host       | Hostname the SMTP certificate was issued for          |
| `EMAIL_FROM`          | yes               | `contacto@dtpf.es`  | Sender email address                                  |
| `NOTIFICATION_TO`     | yes               | `dtpf@dtpf.es`      | Where to receive contact notifications                |
