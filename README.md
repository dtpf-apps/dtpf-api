# dtpf-api

Backend API for the [dtpf.es](https://dtpf.es) personal portfolio website. Handles contact form submissions behind five anti-spam layers, sends styled email notifications via Nodemailer (self-hosted Stalwart SMTP), collects frontend error reports, and serves the pre-built frontend. Live at [dtpf.es](https://dtpf.es).

## Tech Stack

| Technology | Version | Purpose                         |
| ---------- | ------- | ------------------------------- |
| Node.js    | 24      | Runtime                         |
| Express    | 5       | HTTP framework                  |
| TypeScript | 7       | Type safety                     |
| MongoDB    | 8       | Database                        |
| Mongoose   | 9       | ODM                             |
| Zod        | 4       | Request and environment schemas |
| Nodemailer | 10      | Email (Stalwart SMTP)           |
| Pino       | 10      | Structured JSON logging         |
| Vitest     | 5       | Testing                         |

## Prerequisites

- Node.js >= 24
- pnpm
- Docker (for local MongoDB)

## Setup

```bash
git clone https://github.com/dtpf-apps/dtpf-api.git
cd dtpf-api
pnpm install
pnpm db     # local MongoDB on 27019
pnpm dev
```

Development needs no env file: every variable has a local default (below). Copy `.env.development.example` to `.env.development` only to change one.

## Scripts

| Script               | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| `pnpm db`            | Start local MongoDB Docker container (port 27019)           |
| `pnpm dev`           | Dev server: `tsc --watch` + `node --watch` (port 3998)      |
| `pnpm build`         | Compile TypeScript to `dist/`                               |
| `pnpm start`         | Start production server (`NODE_ENV=production`)             |
| `pnpm test`          | Unit and e2e suites                                         |
| `pnpm test:unit`     | Unit suites only                                            |
| `pnpm test:e2e`      | E2E suites only (real HTTP, real MongoDB in memory)         |
| `pnpm test:coverage` | Both suites with v8 coverage and its thresholds             |
| `pnpm typecheck`     | Type-check source and tests together (`tsconfig.test.json`) |
| `pnpm format`        | Format source and tests with Prettier                       |
| `pnpm format:check`  | Fail on unformatted files (CI)                              |

## Environment Variables

`src/config/config.ts` validates the environment at startup with Zod. In development and tests a missing variable takes the default below; in staging and production every variable except `API_VERSION`, `SMTP_PORT` and `SMTP_TLS_SERVERNAME` must be set (and `SMTP_TLS_SERVERNAME` too when `SMTP_HOST` is an IP), and the process refuses to start otherwise, naming what is missing.

| Variable              | Description                                              | Development default |
| --------------------- | -------------------------------------------------------- | ------------------- |
| `NODE_ENV`            | `development`, `test`, `staging` or `production`         | `development`       |
| `API_VERSION`         | API version prefix (`vN`)                                | `v1`                |
| `PORT_SERVER`         | Express port                                             | `3998`              |
| `IP_MONGO_DB`         | MongoDB host                                             | `127.0.0.1`         |
| `PORT_MONGO_DB`       | MongoDB port                                             | `27019`             |
| `DB_NAME`             | Database name                                            | `dtpf`              |
| `SMTP_HOST`           | Stalwart Mail Server host                                | `localhost`         |
| `SMTP_PORT`           | SMTP submission port (STARTTLS required; 465 = implicit) | `587`               |
| `SMTP_USER`           | SMTP auth username; empty skips notifications            | empty               |
| `SMTP_PASS`           | SMTP auth password                                       | empty               |
| `SMTP_TLS_SERVERNAME` | Certificate hostname; required when `SMTP_HOST` is an IP | the SMTP host       |
| `EMAIL_FROM`          | Sender email address                                     | `contacto@dtpf.es`  |
| `NOTIFICATION_TO`     | Recipient for contact notifications                      | `dtpf@dtpf.es`      |

Staging runs exactly like production (log level, certificate checks, static serving); only its data differs.

## Project Structure

```
src/
├── config/config.ts             # Environment schema, validation and the typed config
├── controllers/
│   ├── clientErrors.ts          # Frontend error reports: rate limit, validate, log
│   ├── contact.ts               # Contact form: anti-spam layers, validation, HTTP mapping
│   └── utils.ts                 # Health check (reports the database connection)
├── interfaces/
│   ├── contact.interface.ts
│   └── index.ts
├── middlewares/
│   ├── canonicalHost.middleware.ts    # 301 www.<host> → <host>
│   ├── error.middleware.ts            # Every error answered as JSON with a code
│   ├── requireJson.middleware.ts      # 415 for a POST body that is not JSON
│   └── securityHeaders.middleware.ts  # CSP + security headers
├── models/
│   └── contact.ts               # Contact schema (email, name, message, date)
├── routers/
│   ├── clientErrors.ts          # POST /client-errors
│   ├── contact.ts               # POST /contact-me
│   └── utils.ts                 # GET /connection
├── schemas/
│   ├── clientError.schema.ts    # Error report payload
│   └── contact.schema.ts        # Contact payload and its limits (shared with the model)
├── services/
│   ├── contact.service.ts       # Cooldown, storage and owner notification
│   ├── email.ts                 # Nodemailer SMTP with retry (Stalwart Mail Server)
│   ├── emailTemplates.ts        # Styled HTML email template (Ocean Teal design)
│   └── logger.ts                # Pino structured logging
├── utils/
│   ├── apiError.ts              # Error codes, their messages and the JSON error shape
│   └── rateLimit.ts             # In-memory sliding-window rate limiter
├── app.ts                       # Express setup, trusted proxy, security headers, routes, static client
└── index.ts                     # Entry point: MongoDB, SMTP check, server, graceful shutdown
```

Outside development, the backend serves the pre-built frontend from a `client/` directory as static files with immutable asset caching and no-cache service worker headers. The catch-all serves a route's pre-rendered `client/<route>/index.html` (emitted by the frontend build with that page's own `<head>` tags) when it exists, and otherwise the SPA shell with a 404 status (every real page has a pre-rendered file, so a path without one is unknown; the client renders its not-found page); unknown `/api/*` paths return a JSON 404. Every HTML response carries `Cache-Control: public, max-age=0, no-transform`: Cloudflare injects its Web Analytics beacon into HTML it proxies unless the origin sends `no-transform`, and the CSP would only block that script. A request for a `www.` host is answered with a 301 to the apex before anything else runs.

There is no CORS: every deployed environment serves the client from the API's own origin, and local development reaches the API through the Vite dev-server proxy.

## API Endpoints

All endpoints prefixed with `/api/v1`. Request bodies must be JSON (`415` otherwise) and at most 16 KB (`413`).

| Method | Path                    | Auth   | Description                                   |
| ------ | ----------------------- | ------ | --------------------------------------------- |
| `POST` | `/api/v1/contact-me`    | Public | Submit contact form                           |
| `POST` | `/api/v1/client-errors` | Public | Report frontend errors (rate limited)         |
| `GET`  | `/api/v1/connection`    | Public | Health check: `200`, or `503` without MongoDB |

### Errors

Every error is `{ status, code, message }`. `code` is the contract (the web client shows its own copy for it in the visitor's language); `message` is a Spanish fallback. A `429` also carries a `Retry-After` header and a `retryAfter` field, in seconds.

| Code                                                                                                                                                                                                   | Status |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `invalid_email`, `invalid_name`, `name_too_long`, `message_required`, `message_too_short`, `message_too_long`, `too_many_links`, `invalid_client_error`, `invalid_body`, `invalid_json`, `bad_request` | 400    |
| `not_found`                                                                                                                                                                                            | 404    |
| `payload_too_large`                                                                                                                                                                                    | 413    |
| `unsupported_media_type`                                                                                                                                                                               | 415    |
| `rate_limited`, `email_cooldown`                                                                                                                                                                       | 429    |
| `server_error`                                                                                                                                                                                         | 500    |
| `service_unavailable`                                                                                                                                                                                  | 503    |

## Contact Form Anti-Spam

1. **Honeypot** -- `website` field: if filled, the answer is the same `201` a real message gets, and nothing is stored
2. **Time trap** -- `_t` render timestamp: missing, or under 3 seconds old, gets the same silent `201`
3. **Link limit** -- at most 5 links in the message
4. **Per-caller rate limit** -- 3 messages per hour per client IP (in-memory). The IP is the address the reverse proxy appended to `X-Forwarded-For` (`trust proxy` = 1); anything a caller writes to the left of it is ignored
5. **Per-address cooldown** -- one message per email address every 24 hours (MongoDB), atomic per address so two simultaneous submits cannot both pass

## Email Notifications

When a contact form is submitted, the backend:

1. Saves the message to MongoDB
2. Sends a styled HTML email to the `NOTIFICATION_TO` address without making the visitor wait (one retry, every failure logged)
3. Sets `replyTo` to the sender's email for easy replies, and dates the email in Europe/Madrid time

The email template matches the dtpf.es visual identity (dark background, Ocean Teal accents, card layout).

## Testing

Two Vitest projects. `unit` covers the pure pieces: config validation, schemas, rate limiter, error middleware, email service and template. `e2e` drives the real Express app over HTTP with supertest against a real MongoDB (`mongodb-memory-server`, one server per run, one database per file); only SMTP is replaced, at the email service boundary. Coverage thresholds live in `vitest.config.mts`, and CI runs the type-check, the format check and both projects with coverage before every deploy.

```bash
pnpm test
pnpm test:coverage
pnpm typecheck
```

## Deploy

Gitea Actions CI/CD (`.gitea/workflows/deploy.yml`): a push runs the checks and the build on a self-hosted runner, rsyncs `dist/` and production `node_modules` to the app server, and reloads PM2. The deploy target (`user@host`) and the failure-notification room are repository Actions variables (`APP_SERVER`, `CI_MATRIX_ROOM`), never source. SSH uses `StrictHostKeyChecking=accept-new` against the runner's persistent `known_hosts`, so a changed host key stops the deploy. GitHub receives a read-only push mirror of this repository.

```bash
git push gitea main    # production (dtpf.es, port 3998)
git push gitea dev     # staging (dev.dtpf.es, port 5998)
```

## Code Style

Prettier: 110 char width, single quotes, semicolons, trailing commas (es5), 2-space indent.

## License

[MIT](LICENSE)
