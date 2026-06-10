# dtpf-api

Backend API for the [dtpf.es](https://dtpf.es) personal portfolio website. Handles contact form submissions with 5-layer anti-spam protection, sends styled email notifications via Nodemailer (self-hosted Stalwart SMTP), and collects frontend error reports. Live at [dtpf.es](https://dtpf.es).

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 22 | Runtime |
| Express | 5 | HTTP framework |
| TypeScript | 6.0 | Type safety |
| MongoDB | 8 | Database |
| Mongoose | 9 | ODM |
| Nodemailer | 8 | Email (Stalwart SMTP) |
| Pino | 10 | Structured JSON logging |
| Vitest | 4 | Testing |

## Prerequisites

- Node.js >= 22
- pnpm
- Docker (for local MongoDB)

## Setup

```bash
git clone https://github.com/dtpf-apps/dtpf-api.git
cd dtpf-api
pnpm install
cp .env.development.example .env.development
```

## Scripts

| Script | Description |
|---|---|
| `pnpm db` | Start local MongoDB Docker container (port 27019) |
| `pnpm dev` | Start dev server with `tsc --watch` + nodemon (port 3998) |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Start production server (`NODE_ENV=production`) |
| `pnpm format` | Format source files with Prettier |
| `pnpm test` | Run tests with Vitest |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with v8 coverage report |
| `pnpm test:e2e` | Run e2e suite (supertest, separate Vitest config) |

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `API_VERSION` | API version prefix | `v1` |
| `IP_SERVER` | Server bind address | `127.0.0.1` |
| `IP_MONGO_DB` | MongoDB host | `127.0.0.1` |
| `PORT_MONGO_DB` | MongoDB port | `27019` |
| `DB_NAME` | Database name | `dtpf` |
| `PORT_SERVER` | Express port | `3998` |
| `SMTP_HOST` | Stalwart Mail Server host | `10.5.0.46` |
| `SMTP_PORT` | SMTP submission port | `587` |
| `SMTP_USER` | SMTP auth username (without domain) | -- |
| `SMTP_PASS` | SMTP auth password | -- |
| `EMAIL_FROM` | Sender email address | `contacto@dtpf.es` |
| `NOTIFICATION_TO` | Recipient for contact notifications | `dtpf@dtpf.es` |

## Project Structure

```
src/
├── config/config.ts             # Typed config (app, db, email)
├── controllers/
│   ├── clientErrors.ts          # Frontend error reporting + rate limit
│   ├── contact.ts               # Contact form + anti-spam + email notification
│   └── utils.ts                 # Health check
├── interfaces/
│   ├── config.interface.ts
│   ├── contact.interface.ts
│   └── index.ts
├── middlewares/
│   ├── error.middleware.ts
│   └── securityHeaders.middleware.ts  # CSP + security headers
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
│   └── rateLimit.ts             # Shared in-memory rate limiting
├── app.ts                       # Express config, CORS, pino-http, security headers, route mounting
└── index.ts                     # Entry point: MongoDB connection, server start
```

In production, the backend serves the pre-built frontend from a `client/` directory as static files with SPA catch-all routing, immutable asset caching, and no-cache service worker headers.

## API Endpoints

All endpoints prefixed with `/api/v1`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/contact-me` | Public | Submit contact form |
| `POST` | `/api/v1/client-errors` | Public | Report frontend errors (rate limited) |
| `GET` | `/api/v1/connection` | Public | Health check |

## Contact Form Anti-Spam

The contact endpoint uses 5 layers of protection:

1. **Honeypot** -- `website` field: if filled, returns a fake 200 (bot trap)
2. **Time trap** -- `_t` timestamp: if submitted in under 3 seconds, returns a fake 200
3. **IP rate limit** -- max 3 requests per hour per IP (in-memory)
4. **Email cooldown** -- max 1 message per email address every 24 hours (MongoDB)
5. **URL detection** -- max 5 URLs allowed in message body

## Email Notifications

When a contact form is submitted, the backend:

1. Saves the message to MongoDB
2. Sends a styled HTML email to the `NOTIFICATION_TO` address (non-blocking)
3. Sets `replyTo` to the sender's email for easy replies

The email template matches the dtpf.es visual identity (dark background, Ocean Teal accents, card layout).

## Testing

79 tests across 7 files using Vitest 4. Coverage thresholds: 70% (statements, branches, functions, lines). A separate e2e suite (`test/e2e/`, supertest with mocked MongoDB/email) runs via its own Vitest config.

```bash
pnpm test
pnpm test:coverage
pnpm test:e2e
```

## Deploy

Gitea Actions CI/CD (`.gitea/workflows/deploy.yml`): push runs tests + build on a self-hosted runner, rsyncs `dist/` and production `node_modules` to the app server, and reloads PM2. The previous GitHub Actions workflow is kept disabled (`.github/workflows/deploy.yml.disabled`) as disaster-recovery fallback.

```bash
git push origin main    # production (dtpf.es, port 3998)
git push origin dev     # staging (dev.dtpf.es, port 5998)
```

## Code Style

Prettier: 110 char width, single quotes, semicolons, trailing commas (es5), 2-space indent.

## License

MIT
