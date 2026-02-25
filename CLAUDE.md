# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Backend for the dtpf.es personal portfolio website. Built with Node.js 16, Express 4, MongoDB 5 (Mongoose), and Socket.io for real-time features. Deployed at https://dtpf.es.

## Commands

```bash
npm run dev      # Start dev server (NODE_ENV=development, uses nodemon)
npm run start    # Start production server (NODE_ENV=production)
npm run db       # Start local MongoDB Docker container (dtpf-mongodb)
```

No test framework or linter is configured.

## Architecture

Standard MVC pattern with Express:

- **Entry**: `src/index.js` creates HTTP server with Socket.io, `src/app.js` configures Express
- **Routers** (`src/routers/`): Define API routes under `/api/v1/`, apply middleware
- **Controllers** (`src/controllers/`): Business logic, callback-based async style
- **Models** (`src/models/`): Mongoose schemas (User, Contact, Menu, Education, AboutMe, Utils)
- **Middleware** (`src/middlewares/authenticated.js`): JWT token validation via `ensureAuth`
- **Services** (`src/services/jwt.js`): Token creation (accessToken + refreshToken, 24h expiry) using jwt-simple
- **Config** (`src/config/config.js`): Loads `.env.development` or `.env.production` based on NODE_ENV
- **WebSockets** (`src/webSockets.js`): Socket.io handlers for real-time unread message count (5s polling)

## Key Patterns

- **Auth**: JWT tokens in Authorization header. `[md_auth.ensureAuth]` middleware on protected routes. Three roles: admin, editor, reviewer. Self-registered users start as inactive editors needing admin activation.
- **Response format**: `{ status: <httpCode>, message: "...", [data] }` — status code is repeated inside the JSON body.
- **Error messages**: Written in Spanish.
- **File uploads**: `connect-multiparty` middleware, stored in `./uploads/avatar/` and `./uploads/education/`. Education images get auto-generated thumbnails (318x191px) via Sharp.
- **Async style**: Callbacks passed to Mongoose methods (not Promises/async-await).
- **Route naming**: kebab-case (e.g., `/api/v1/sign-up`, `/api/v1/get-courses`).
- **Pagination**: `mongoose-paginate-v2` used on education/courses endpoints (default 10 per page).

## Domains

| Domain | Model | Key functionality |
|---|---|---|
| Auth/Users | User | Sign-up/sign-in, avatar upload, role management, token refresh |
| Contact | Contact | Form submissions, read/unread tracking, rate-limited per sender |
| Menu | Menu | Navigation items with ordering and active state |
| Education | Education | Courses with pagination, image thumbnails, tags, URL-based navigation |
| About Me | AboutMe | Structured content (title + 6 content sections) |
| Utils | Utils | Health check, message reload flags, IndexedDB versioning |
