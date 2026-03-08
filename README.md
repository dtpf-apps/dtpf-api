# dtpf-backend-node

Backend API for the [dtpf.es](https://dtpf.es) personal portfolio website. Handles contact form submissions with multi-layer anti-spam protection, email notifications via Nodemailer, and authentication proxy (BFF) for dauth integration.

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express 5
- **Language:** TypeScript 5.9
- **Database:** MongoDB with Mongoose 9
- **Authentication:** dauth via dauth-md-node (BFF proxy)
- **Email:** Nodemailer (Gmail SMTP)
- **Logging:** Pino + pino-http (structured JSON)
- **Package Manager:** pnpm

## Prerequisites

- Node.js >= 22
- pnpm
- Docker (for local MongoDB)

## Installation

```bash
git clone https://github.com/dtpf-apps/dtpf-backend-node.git
cd dtpf-backend-node
pnpm install
```

Copy the environment example file and configure it:

```bash
cp .env.development.example .env.development
```

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `db` | `pnpm db` | Start local MongoDB Docker container (`dtpf-mongodb`, port 27019) |
| `dev` | `pnpm dev` | Start dev server with `tsc --watch` + nodemon (port 3998) |
| `build` | `pnpm build` | Compile TypeScript to `dist/` |
| `start` | `pnpm start` | Start production server (`NODE_ENV=production`) |
| `format` | `pnpm format` | Format source files with Prettier |

## Development

```bash
# 1. Start MongoDB
pnpm db

# 2. Start the dev server (port 3998)
pnpm dev
```

The server starts at `http://127.0.0.1:3998/api/v1/`.

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

In production, the backend serves the pre-built frontend from a `client/` directory as static files with SPA catch-all routing.

## API Endpoints

All endpoints are prefixed with `/api/v1/`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/contact-me` | No | Submit contact form |
| `GET` | `/api/v1/connection` | No | Health check |
| `*` | `/api/auth/*` | -- | dauth BFF proxy (exchange-code, session, etc.) |

The `/api/auth/*` routes are provided by the `dauthRouter` from the `dauth-md-node` package, handling authorization code exchange for dauth-based authentication.

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

## Environment Variables

Copy `.env.development.example` to `.env.development` and fill in the values.

| Variable | Example | Description |
|----------|---------|-------------|
| `API_VERSION` | `v1` | API version prefix |
| `IP_SERVER` | `127.0.0.1` | Server bind address |
| `IP_MONGO_DB` | `127.0.0.1` | MongoDB host |
| `PORT_MONGO_DB` | `27019` | MongoDB port |
| `DB_NAME` | `dtpf` | Database name |
| `PORT_SERVER` | `3998` | Express port |
| `DAUTH_TSK` | -- | dauth tenant secret key |
| `DAUTH_DOMAIN_NAME` | `dtpf` | dauth domain name |
| `DAUTH_DOMAIN_URL` | `http://localhost:5185` | dauth frontend URL |
| `DAUTH_PREVIOUS_TSK` | _(empty)_ | For zero-downtime TSK rotation |
| `EMAIL` | `your-email@gmail.com` | Gmail SMTP sender |
| `EMAIL_PASSWORD` | -- | Gmail app password |
| `NOTIFICATION_TO` | `your@email.com` | Recipient for contact notifications |

## Deployment

Deployment is automatic via GitHub Actions. Push to a branch triggers build + deploy via rsync to the app server.

```bash
git push origin main    # deploys to production (dtpf.es, port 3998)
git push origin dev     # deploys to staging (dev.dtpf.es, port 5998)
```

Server paths: `/html/dtpf/production/`, `/html/dtpf/staging/`. Process manager: PM2.

## Code Style

- Prettier: 110 char width, single quotes, semicolons, trailing commas (es5), 2-space indent
- No linter or test framework configured

## License

MIT
