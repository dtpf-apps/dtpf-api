# CLAUDE.md

> Ecosystem context: root `d-context/CLAUDE.md` (common stack + conventions, shared rules) and `docs/services/dtpf.es.md` (cross-sub-project service guide: portfolio + API coordination, deploy map). This file covers `dtpf-api` internals only.

## Project Overview

Backend for the dtpf.es personal portfolio website. Built with Node.js 24, Express 5, TypeScript 7, and MongoDB (Mongoose 9.10). Package manager: **pnpm**.

Serves as the **contact form API** — receives messages, stores in MongoDB, sends email notification via Stalwart Mail Server.

## Commands

```bash
pnpm db              # Start local MongoDB Docker container (dtpf-mongodb, port 27019)
pnpm dev             # tsc --watch + node --watch (NODE_ENV=development, port 3998)
pnpm build           # Compile TypeScript to dist/
pnpm start           # Production server (NODE_ENV=production)
pnpm format          # Prettier
pnpm test            # Run tests (vitest)
pnpm test:watch      # Run tests in watch mode
pnpm test:coverage   # Run tests with v8 coverage report
pnpm test:e2e        # E2E suite (vitest.e2e.config.mts, supertest)
```

### Testing

Vitest 5 with globals. **82 tests** across 7 unit test files. Coverage thresholds: 70% (statements, branches, functions, lines). Tests run in CI before deploy (Gitea Actions, `.gitea/workflows/deploy.yml`; GitHub only receives a read-only push mirror).

`vite` is a direct devDependency even though this backend compiles with `tsc` and never bundles. It arrives as vitest's own dependency across a three-major range, and an override cannot move a version the lockfile already pins — so declaring it directly is what actually decides which major the test toolchain runs on. It is dev-only and the deploy prunes it.

```
test/
├── helpers/mocks.ts                  # Mock factories (req/res/next, valid contact body)
├── controllers/
│   ├── clientErrors.test.ts          # 20 tests — client error reporting + rate limit
│   ├── contact.test.ts               # 32 tests — all 5 anti-spam layers + validation + happy path
│   └── utils.test.ts                 # 1 test — health check
├── middlewares/
│   ├── error.test.ts                 # 8 tests — error middleware
│   └── securityHeaders.test.ts       # 2 tests — CSP + security headers
├── services/
│   ├── email.test.ts                 # 8 tests — sendEmail retry logic, verifyEmailConnection
│   └── emailTemplates.test.ts        # 11 tests — HTML generation, XSS escaping
└── e2e/api.e2e.test.ts               # 16 tests — full HTTP cycle via supertest (pnpm test:e2e, own config)
```

Key patterns: `vi.hoisted()` for mock variables used in `vi.mock()` factories, `vi.useFakeTimers()` for retry delays, unique IPs per test to avoid rate limit state leakage.

## Architecture

### Entry Flow

`src/index.ts` connects to MongoDB, verifies email transporter, and starts Express server.
`src/app.ts` configures middleware (JSON/urlencoded parsers with 16kb limit, compression, pino-http, CORS, security headers incl. CSP) and mounts routes. In production, serves the frontend from `client/` with optimized static serving: `/assets` with 1-year immutable cache, `/service-worker.js` with no-cache headers, and SPA catch-all routing.

### File Structure

```
src/
├── config/config.ts             # Typed config (app, db, email)
├── controllers/
│   ├── clientErrors.ts          # Client error reporting + rate limit
│   ├── contact.ts               # Contact form + anti-spam + email notification
│   └── utils.ts                 # Health check
├── interfaces/
│   ├── config.interface.ts
│   ├── contact.interface.ts
│   └── index.ts
├── middlewares/
│   ├── error.middleware.ts
│   └── securityHeaders.middleware.ts  # CSP + nosniff/frame/referrer/permissions headers
├── models/
│   └── contact.ts               # Contact schema (email, name, message, date)
├── routers/
│   ├── clientErrors.ts          # POST /client-errors
│   ├── contact.ts               # POST /contact-me
│   └── utils.ts                 # GET /connection
├── services/
│   ├── email.ts                 # Nodemailer SMTP with retry (Stalwart Mail Server)
│   ├── emailTemplates.ts        # Styled HTML email template (Ocean Teal design)
│   └── logger.ts                # Pino structured logging
├── utils/
│   ├── constants.ts
│   └── rateLimit.ts             # Shared rate limiting utility
├── app.ts
└── index.ts
```

### API Endpoints

| Method | Path                    | Auth   | Description                           |
| ------ | ----------------------- | ------ | ------------------------------------- |
| `POST` | `/api/v1/contact-me`    | Public | Submit contact form                   |
| `POST` | `/api/v1/client-errors` | Public | Report frontend errors (rate limited) |
| `GET`  | `/api/v1/connection`    | Public | Health check                          |

### Contact Form Anti-Spam (5 layers)

1. **Honeypot** — `website` field: if filled → fake 200 (bot trap)
2. **Time trap** — `_t` timestamp: if submitted in < 3s → fake 200
3. **IP rate limit** — max 3 requests/hour per IP (in-memory)
4. **Email cooldown** — max 1 message per email every 24h (MongoDB)
5. **URL detection** — max 5 URLs in message body

### Email Notifications

When a contact form is submitted, the backend:

1. Saves to MongoDB
2. Sends styled HTML email to `NOTIFICATION_TO` address (non-blocking)
3. Sets `replyTo` to the sender's email for easy replies

Email template matches the dtpf.es visual identity (dark bg, Ocean Teal accents, card layout).

### Key Patterns

- **Structured logging** via pino + pino-http (JSON output)
- **Async/await** throughout all controllers
- **Error messages** in Spanish
- **CORS** whitelist: localhost:3000, dtpf.es, dev.dtpf.es

## Environment Variables

| Variable          | Example            | Description                            |
| ----------------- | ------------------ | -------------------------------------- |
| `API_VERSION`     | `v1`               | API version prefix                     |
| `IP_SERVER`       | `127.0.0.1`        | Server bind address                    |
| `IP_MONGO_DB`     | `127.0.0.1`        | MongoDB host                           |
| `PORT_MONGO_DB`   | `27019`            | MongoDB port                           |
| `DB_NAME`         | `dtpf`             | Database name                          |
| `PORT_SERVER`     | `3998`             | Express port                           |
| `SMTP_HOST`       | `mail.example.com` | Stalwart Mail Server host              |
| `SMTP_PORT`       | `587`              | SMTP submission port                   |
| `SMTP_USER`       | `contacto`         | SMTP auth username (without domain)    |
| `SMTP_PASS`       | `<password>`       | SMTP auth password                     |
| `EMAIL_FROM`      | `contacto@dtpf.es` | Sender email address                   |
| `NOTIFICATION_TO` | `dtpf@dtpf.es`     | Where to receive contact notifications |
