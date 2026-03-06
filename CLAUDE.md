# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Backend for the dtpf.es personal portfolio website. Built with Node.js 22, Express 5, TypeScript, MongoDB (Mongoose 9), and Socket.io 4 for real-time features. Deployed at https://dtpf.es. Package manager: **pnpm**.

**Authentication** is handled externally by **dauth** via `dauth-md-node` middleware. There is no local User model — all user identity comes from dauth (passwordless: magic link + passkey).

## Commands

```bash
pnpm db          # Start local MongoDB Docker container (dtpf-mongodb, port 27019)
pnpm dev         # tsc --watch + nodemon (NODE_ENV=development, port 3998)
pnpm build       # Compile TypeScript to dist/
pnpm start       # Start production server (NODE_ENV=production)
pnpm format      # Prettier
```

No test framework or linter is configured.

## Architecture

Standard MVC pattern with Express + TypeScript:

- **Entry**: `src/index.ts` connects to MongoDB via async/await, creates HTTP server with Socket.io 4
- **App**: `src/app.ts` configures Express with `express.json()`, CORS (origin whitelist including dauth URL), error middleware, and all route registrations. In production mode, serves the frontend from `client/` as static files with SPA catch-all routing.
- **Interfaces** (`src/interfaces/`): TypeScript interfaces for content models (`IContact`, `IEducation`, `IMenu`, `IAboutMe`, `IUtils`), config, and auth types. `IRequestUser` uses `IDauthUser` from `dauth-md-node`. Barrel export via `index.ts`.
- **Routers** (`src/routers/`): Define API routes under `/api/v1/`, apply `dauth_md` middleware on protected routes
- **Controllers** (`src/controllers/`): Business logic using async/await throughout
- **Models** (`src/models/`): Typed Mongoose schemas with `Schema<IDocument>` generics. Content models only (Contact, Education, Menu, AboutMe, Utils) — no User model.
- **Middleware** (`src/middlewares/authenticated.ts`): `dauth_md` middleware from `dauth-md-node` — verifies JWTs signed by dauth with the tenant secret key. Error middleware in `error.middleware.ts`.
- **Config** (`src/config/config.ts`): Typed config with sections: `app`, `db`, `dauth`. Loaded from `.env.development`, `.env.staging`, or `.env.production` based on NODE_ENV.
- **Constants** (`src/utils/constants.ts`): Stage constants with `as const` typing
- **WebSockets** (`src/webSockets.ts`): Socket.io handler that polls unread Contact messages count every 5 seconds

## Key Patterns

- **Auth**: `dauth_md` middleware on all admin routes. Verifies JWT from Authorization header against dauth tenant secret. `req.user` contains `IDauthUser` with fields like `_id`, `name`, `email`, `role`, `isVerified`, etc.
- **Response format**: Mixed formats across controllers. Older controllers use `{ message: "..." }`. Newer ones use `{ status: <httpCode>, message: "...", [data] }`.
- **Error messages**: Written in Spanish.
- **File uploads**: `multer` middleware. Education images go to `./uploads/education/` with auto-generated thumbnails (`thumb_` prefix, 318x191px) via Sharp.
- **Async style**: async/await throughout all controllers and models.
- **Route naming**: kebab-case (e.g., `/api/v1/get-courses`, `/api/v1/add-menu`).
- **Pagination**: `mongoose-paginate-v2` used on education/courses endpoint (default 10 per page).
- **Rate limiting**: Contact form prevents sending a new message until the previous one is marked as read.
- **Structured logging**: pino + pino-http (JSON output). Logger in `src/services/logger.ts`.

## Content Domains

| Domain | Model | Key functionality |
|---|---|---|
| Contact | Contact | Form submissions, read/unread tracking, rate-limited per sender email |
| Menu | Menu | Navigation items with ordering (`order` field) and active/inactive state |
| Education | Education | Courses with pagination, image upload + thumbnails, tags, URL-based lookup, prev/next navigation |
| About Me | AboutMe | Structured content blocks (title + 6 content sections), looked up by title |
| Utils | Utils | Health check (`/connection`), message reload flags, IndexedDB version tracking |

## Environment Variables

### Development (`.env.development`)

| Variable | Example | Description |
|---|---|---|
| `API_VERSION` | `v1` | API version prefix |
| `IP_SERVER` | `127.0.0.1` | Server bind address |
| `IP_MONGO_DB` | `127.0.0.1` | MongoDB host address |
| `PORT_MONGO_DB` | `27019` | MongoDB port |
| `DB_NAME` | `dtpf` | MongoDB database name |
| `PORT_SERVER` | `3998` | Express server port |
| `DAUTH_TSK` | `<secret>` | Dauth tenant secret key (must match `DTPF_TENANT_SECRET_KEY` in dauth backend) |
| `DAUTH_DOMAIN_NAME` | `dtpf` | Dauth domain name |
| `DAUTH_DOMAIN_URL` | `http://localhost:5185` | Dauth frontend URL (included in CORS whitelist) |
| `DAUTH_PREVIOUS_TSK` | _(empty)_ | Previous TSK for zero-downtime key rotation (leave empty normally) |

### Production (`.env.production`)

Same variables plus `DB_USER_PASSWORD` (format: `user:password`) for authenticated MongoDB connections.
