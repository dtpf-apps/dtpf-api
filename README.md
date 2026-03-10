# dtpf-backend-node

Backend API for the [dtpf.es](https://dtpf.es) personal portfolio website. Handles contact form submissions with 5-layer anti-spam protection, sends styled email notifications via Nodemailer, and provides a BFF auth proxy for dauth integration. Live at [dtpf.es](https://dtpf.es).

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 22 | Runtime |
| Express | 5 | HTTP framework |
| TypeScript | 5.9 | Type safety |
| MongoDB | 8 | Database |
| Mongoose | 9 | ODM |
| Nodemailer | 8 | Email (Gmail SMTP) |
| Pino | 10 | Structured JSON logging |
| dauth-md-node | 4 | Auth BFF proxy |
| Vitest | 4 | Testing |

## Prerequisites

- Node.js >= 22
- pnpm
- Docker (for local MongoDB)

## Setup

```bash
git clone https://github.com/dtpf-apps/dtpf-backend-node.git
cd dtpf-backend-node
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

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `API_VERSION` | API version prefix | `v1` |
| `IP_SERVER` | Server bind address | `127.0.0.1` |
| `IP_MONGO_DB` | MongoDB host | `127.0.0.1` |
| `PORT_MONGO_DB` | MongoDB port | `27019` |
| `DB_NAME` | Database name | `dtpf` |
| `PORT_SERVER` | Express port | `3998` |
| `DAUTH_TSK` | dauth tenant secret key | -- |
| `DAUTH_DOMAIN_NAME` | dauth domain name | `dtpf` |
| `DAUTH_DOMAIN_URL` | dauth frontend URL | `http://localhost:5185` |
| `DAUTH_PREVIOUS_TSK` | For zero-downtime TSK rotation | _(empty)_ |
| `EMAIL` | Gmail SMTP sender address | -- |
| `EMAIL_PASSWORD` | Gmail app password | -- |
| `NOTIFICATION_TO` | Recipient for contact notifications | -- |

## Project Structure

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
├── app.ts                       # Express config, CORS, pino-http, route mounting
└── index.ts                     # Entry point: MongoDB connection, server start
```

In production, the backend serves the pre-built frontend from a `client/` directory as static files with SPA catch-all routing, immutable asset caching, and no-cache service worker headers.

## API Endpoints

All endpoints prefixed with `/api/v1`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/contact-me` | Public | Submit contact form |
| `GET` | `/api/v1/connection` | Public | Health check |
| `*` | `/api/auth/*` | -- | dauth BFF proxy (exchange-code, session) |

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

38 tests across 5 files using Vitest 4. Coverage thresholds: 70% (statements, branches, functions, lines).

```bash
pnpm test
pnpm test:coverage
```

## Deploy

GitHub Actions CI/CD. Push triggers build on self-hosted runner + rsync to app server.

```bash
git push origin main    # production (dtpf.es, port 3998)
git push origin dev     # staging (dev.dtpf.es, port 5998)
```

## Code Style

Prettier: 110 char width, single quotes, semicolons, trailing commas (es5), 2-space indent.

## License

MIT
