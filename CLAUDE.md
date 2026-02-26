# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Backend for the dtpf.es personal portfolio website. Built with Node.js 22, Express 4, TypeScript, MongoDB (Mongoose 9), and Socket.io 4 for real-time features. Deployed at https://dtpf.es. Package manager: **pnpm**.

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
- **App**: `src/app.ts` configures Express with `express.json()`, CORS headers, error middleware, and all route registrations. In production mode, serves the frontend from `client/` as static files with SPA catch-all routing.
- **Interfaces** (`src/interfaces/`): TypeScript interfaces for all models (`IUser`, `IContact`, `IEducation`, `IMenu`, `IAboutMe`, `IUtils`), config, and auth/JWT types. Barrel export via `index.ts`.
- **Routers** (`src/routers/`): Define API routes under `/api/v1/`, apply middleware
- **Controllers** (`src/controllers/`): Business logic using async/await throughout
- **Models** (`src/models/`): Typed Mongoose schemas with `Schema<IDocument>` generics
- **Middleware** (`src/middlewares/authenticated.ts`): JWT token validation via `ensureAuth`. Error middleware in `error.middleware.ts`.
- **Services** (`src/services/jwt.ts`): Token creation (accessToken + refreshToken, 24h expiry) using jwt-simple
- **Config** (`src/config/config.ts`): Typed config loaded from `.env.development` or `.env.production` based on NODE_ENV
- **Constants** (`src/utils/constants.ts`): Role and stage constants with `as const` typing
- **WebSockets** (`src/webSockets.ts`): Socket.io handler that polls unread Contact messages count every 5 seconds

## Key Patterns

- **Auth**: JWT tokens in Authorization header. `ensureAuth` middleware on protected routes. Returns 401 for invalid/expired tokens, 403 for missing auth header. User model defines three roles: `admin`, `editor`, `reviewer`. Self-registered users get `role: "editor"` and `active: false` (need admin activation). `signUpAdmin` creates pre-activated users with any role.
- **Response format**: Mixed formats across controllers. Older controllers use `{ message: "..." }`. Newer ones use `{ status: <httpCode>, message: "...", [data] }`.
- **Error messages**: Written in Spanish.
- **File uploads**: `multer` middleware. Avatar uploads go to `./uploads/avatar/`. Education images go to `./uploads/education/` with auto-generated thumbnails (`thumb_` prefix, 318x191px) via Sharp.
- **Async style**: async/await throughout all controllers and models.
- **Route naming**: kebab-case (e.g., `/api/v1/sign-up`, `/api/v1/get-courses`).
- **Pagination**: `mongoose-paginate-v2` used on education/courses endpoint (default 10 per page).
- **Rate limiting**: Contact form prevents sending a new message until the previous one is marked as read.
- **Intentional delays**: `signUp` has a 5-second delay before responding. `signIn` has a 5-second delay on wrong password.

## Domains

| Domain | Model | Key functionality |
|---|---|---|
| Auth | (uses User) | Token refresh endpoint |
| Users | User | Sign-up/sign-in, avatar upload, role management, activation, admin user creation |
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
| `SECRET_KEY` | `secretKey` | JWT signing secret |

### Production (`.env.production`)

Same variables plus `DB_USER_PASSWORD` (format: `user:password`) for authenticated MongoDB connections.
