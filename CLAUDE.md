# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Backend for the dtpf.es personal portfolio website. Built with Node.js 22, Express 5, TypeScript 5.9, and MongoDB (Mongoose 9). Package manager: **pnpm**.

Serves two purposes:
1. **Contact form API** — receives messages, stores in MongoDB, sends email notification
2. **Auth proxy (BFF)** — `dauthRouter` from `dauth-md-node` handles auth code exchange for dauth integration

## Commands

```bash
pnpm db              # Start local MongoDB Docker container (dtpf-mongodb, port 27019)
pnpm dev             # tsc --watch + nodemon (NODE_ENV=development, port 3998)
pnpm build           # Compile TypeScript to dist/
pnpm start           # Production server (NODE_ENV=production)
pnpm format          # Prettier
pnpm test            # Run tests (vitest)
pnpm test:watch      # Run tests in watch mode
pnpm test:coverage   # Run tests with v8 coverage report
```

### Testing

Vitest 4 with globals. **38 tests** across 5 test files. Coverage thresholds: 70% (statements, branches, functions, lines). Tests run in CI before deploy.

```
test/
├── helpers/mocks.ts                  # Mock factories (req/res/next, valid contact body)
├── controllers/
│   ├── contact.test.ts               # 21 tests — all 5 anti-spam layers + validation + happy path
│   └── utils.test.ts                 # 1 test — health check
├── middlewares/error.test.ts         # 3 tests — error middleware
└── services/
    ├── email.test.ts                 # 5 tests — sendEmail retry logic, verifyEmailConnection
    └── emailTemplates.test.ts        # 8 tests — HTML generation, XSS escaping
```

Key patterns: `vi.hoisted()` for mock variables used in `vi.mock()` factories, `vi.useFakeTimers()` for retry delays, unique IPs per test to avoid rate limit state leakage.

## Architecture

### Entry Flow

`src/index.ts` connects to MongoDB, verifies email transporter, and starts Express server.
`src/app.ts` configures middleware (JSON parser, CORS, pino-http) and mounts routes. In production, serves the frontend from `client/` with optimized static serving: `/assets` with 1-year immutable cache, `/service-worker.js` with no-cache headers, and SPA catch-all routing.

### File Structure

```
src/
├── config/config.ts             # Typed config (app, db, dauth, email)
├── controllers/
│   ├── contact.ts               # Contact form + anti-spam + email notification
│   └── utils.ts                 # Health check
├── interfaces/
│   ├── config.interface.ts
│   ├── contact.interface.ts
│   └── index.ts
├── middlewares/
│   └── error.middleware.ts
├── models/
│   └── contact.ts               # Contact schema (email, name, message, date)
├── routers/
│   ├── contact.ts               # POST /contact-me
│   └── utils.ts                 # GET /connection
├── services/
│   ├── email.ts                 # Nodemailer Gmail SMTP with retry
│   ├── emailTemplates.ts        # Styled HTML email template (Ocean Teal design)
│   └── logger.ts                # Pino structured logging
├── utils/constants.ts
├── app.ts
└── index.ts
```

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/contact-me` | Public | Submit contact form |
| `GET` | `/api/v1/connection` | Public | Health check |
| `*` | `/api/auth/*` | — | dauth BFF proxy (exchange-code, session, etc.) |

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
3. Sets `replyTo` to the sender's email for easy Gmail replies

Email template matches the dtpf.es visual identity (dark bg, Ocean Teal accents, card layout).

### Key Patterns

- **Structured logging** via pino + pino-http (JSON output)
- **Async/await** throughout all controllers
- **Error messages** in Spanish
- **CORS** whitelist: dauth URL, localhost:3000, dtpf.es, dev.dtpf.es

## Environment Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `API_VERSION` | `v1` | API version prefix |
| `IP_SERVER` | `127.0.0.1` | Server bind address |
| `IP_MONGO_DB` | `127.0.0.1` | MongoDB host |
| `PORT_MONGO_DB` | `27019` | MongoDB port |
| `DB_NAME` | `dtpf` | Database name |
| `PORT_SERVER` | `3998` | Express port |
| `DAUTH_TSK` | `<secret>` | Dauth tenant secret key |
| `DAUTH_DOMAIN_NAME` | `dtpf` | Dauth domain name |
| `DAUTH_DOMAIN_URL` | `http://localhost:5185` | Dauth frontend URL |
| `DAUTH_PREVIOUS_TSK` | _(empty)_ | For zero-downtime TSK rotation |
| `EMAIL` | `dtpf.apps@gmail.com` | Gmail SMTP sender |
| `EMAIL_PASSWORD` | `<app-password>` | Gmail app password |
| `NOTIFICATION_TO` | `your@email.com` | Where to receive contact notifications |

## Code Style

- Prettier: 110 char width, semicolons, single quotes, trailing commas (es5), 2-space indent
