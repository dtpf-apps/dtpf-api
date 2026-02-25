# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Backend for the dtpf.es personal portfolio website. Built with Node.js 16, Express 4, MongoDB 5 (Mongoose 5), and Socket.io 2 for real-time features. Pure JavaScript (no TypeScript). Deployed at https://dtpf.es. Package manager: **npm**.

## Commands

```bash
npm run dev      # Start dev server (NODE_ENV=development, uses nodemon, port 3998)
npm run start    # Start production server (NODE_ENV=production, port 3998)
npm run db       # Start local MongoDB Docker container (dtpf-mongodb, port 27019)
```

No test framework, linter, or formatter is configured.

## Architecture

Standard MVC pattern with Express:

- **Entry**: `src/index.js` creates HTTP server with Socket.io, connects to MongoDB via Mongoose
- **App**: `src/app.js` configures Express with body-parser, CORS headers, and all route registrations. In production mode, serves the frontend from `client/` as static files with SPA catch-all routing.
- **Routers** (`src/routers/`): Define API routes under `/api/v1/`, apply middleware
- **Controllers** (`src/controllers/`): Business logic, predominantly callback-based async style (some `.then()` calls)
- **Models** (`src/models/`): Mongoose schemas (User, Contact, Menu, Education, AboutMe, Utils)
- **Middleware** (`src/middlewares/authenticated.js`): JWT token validation via `ensureAuth`
- **Services** (`src/services/jwt.js`): Token creation (accessToken + refreshToken, 24h expiry) using jwt-simple
- **Config** (`src/config/config.js`): Loads `.env.development` or `.env.production` based on NODE_ENV. Separate config objects for dev/prod with different MongoDB port defaults (dev: 27019, prod: 27018).
- **Constants** (`src/utils/constants.js`): Role constants (`admin`, `user`) and stage constants (`development`, `production`)
- **WebSockets** (`src/webSockets.js`): Socket.io handler that polls unread Contact messages count every 5 seconds

## Key Patterns

- **Auth**: JWT tokens in Authorization header. `[md_auth.ensureAuth]` middleware on protected routes. User model defines three roles: `admin`, `editor`, `reviewer`. Self-registered users get `role: "editor"` and `active: false` (need admin activation). `signUpAdmin` creates pre-activated users with any role.
- **Response format**: Mixed formats across controllers. Older controllers use `{ message: "..." }`. Newer ones use `{ status: <httpCode>, message: "...", [data] }`.
- **Error messages**: Written in Spanish.
- **File uploads**: `connect-multiparty` middleware. Avatar uploads go to `./uploads/avatar/`. Education images go to `./uploads/education/` with auto-generated thumbnails (`thumb_` prefix, 318x191px) via Sharp.
- **Async style**: Predominantly callback-based Mongoose methods. Some controllers use `.then()` (e.g., `getUsers`, `webSockets`).
- **Route naming**: kebab-case (e.g., `/api/v1/sign-up`, `/api/v1/get-courses`).
- **Pagination**: `mongoose-paginate-v2` used on education/courses endpoint (default 10 per page).
- **Rate limiting**: Contact form prevents sending a new message until the previous one is marked as read.
- **Intentional delays**: `signUp` has a 5-second delay before responding. `signIn` has a 5-second delay on wrong password.

## Known Issues

- **Missing `require('sharp')`**: `src/controllers/education.js` uses `sharp()` at line 220 but never imports it. The module is in `package.json` dependencies but the `require` statement is missing from the controller file.
- **`.env.development.example` incomplete**: Missing `IP_MONGO_DB` variable which is required by `src/config/config.js`. The config references `process.env.IP_MONGO_DB` for the MongoDB connection URL.
- **`fs.exists` deprecated**: Used in `getAvatar` and `getImage` controllers. Should use `fs.existsSync` or `fs.access`.
- **Mongoose 5 legacy patterns**: Uses `useFindAndModify`, `useCreateIndex`, `useNewUrlParser`, `useUnifiedTopology` options that are unnecessary in Mongoose 6+.

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
