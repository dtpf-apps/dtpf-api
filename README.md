# dtpf-backend-node

Backend API for the [dtpf.es](https://dtpf.es) personal portfolio website. Provides RESTful endpoints for user authentication, portfolio content management (education/courses, menu, about me), contact form handling, and real-time unread message notifications via WebSockets.

## Tech Stack

- **Runtime:** Node.js 16
- **Framework:** Express 4
- **Database:** MongoDB 5 with Mongoose 5 ODM
- **Authentication:** JWT (jwt-simple) with access and refresh tokens (24h expiry)
- **WebSockets:** Socket.io 2
- **Image Processing:** Sharp (thumbnail generation)
- **File Uploads:** connect-multiparty
- **Password Hashing:** bcrypt
- **Language:** JavaScript (ES6+, CommonJS modules)

## Prerequisites

- Node.js >= 16
- npm
- Docker (for local MongoDB) or a running MongoDB 5 instance
- A local MongoDB Docker container named `dtpf-mongodb` mapped to port 27019

To create the Docker container for the first time:

```bash
docker run -d --name dtpf-mongodb -p 27019:27017 mongo:5
```

## Installation

```bash
git clone https://github.com/DTPF/portfolio.backend.git dtpf-backend-node
cd dtpf-backend-node
npm install
```

Copy the environment example file and configure it:

```bash
cp .env.development.example .env.development
```

Edit `.env.development` with your settings. Note that `IP_MONGO_DB` is required by the application but missing from the example file -- add it manually:

```
API_VERSION=v1
IP_SERVER=127.0.0.1
IP_MONGO_DB=127.0.0.1
PORT_MONGO_DB=27019
DB_NAME=dtpf
PORT_SERVER=3998
SECRET_KEY=your-secret-key
```

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `db` | `npm run db` | Start the local MongoDB Docker container |
| `dev` | `npm run dev` | Start development server with nodemon (auto-restart on changes) |
| `start` | `npm run start` | Start production server |

## Development

```bash
# 1. Start MongoDB
npm run db

# 2. Start the dev server (port 3998)
npm run dev
```

The server starts at `http://127.0.0.1:3998/api/v1/`.

## Project Structure

```
src/
  index.js              # Entry point: HTTP server, Socket.io, MongoDB connection
  app.js                # Express configuration, CORS, route registration, SPA serving (production)
  config/
    config.js           # Environment-based configuration loader (.env files)
  controllers/          # Business logic (request handlers)
    aboutMe.js          # About Me CRUD
    auth.js             # Token refresh
    contact.js          # Contact form and message management
    education.js        # Courses CRUD with pagination, images, tags
    menu.js             # Navigation menu CRUD
    user.js             # User registration, authentication, management
    utils.js            # Health check, IndexedDB versioning, message reload flags
  middlewares/
    authenticated.js    # JWT validation middleware (ensureAuth)
  models/               # Mongoose schemas
    aboutMe.js          # AboutMe: title + 6 content sections
    contact.js          # Contact: email, name, phone, subject, message, read status
    education.js        # Education: title, description, duration, image, tags, URL (paginated)
    menu.js             # Menu: title, url, order, active state
    user.js             # User: name, lastname, email, password, role, active, avatar
    utils.js            # Utils: reload flags, IndexedDB version
  routers/              # Express route definitions (all under /api/v1/)
    aboutMe.js
    auth.js
    contact.js
    education.js
    menu.js
    user.js
    utils.js
  services/
    jwt.js              # JWT token creation and decoding (jwt-simple)
  utils/
    constants.js        # Role and stage constants
  webSockets.js         # Socket.io handler for unread message count polling
uploads/                # File upload storage (gitignored content)
  avatar/               # User avatar images
  education/            # Course images and thumbnails (thumb_ prefix)
```

## API Endpoints

All endpoints are prefixed with `/api/v1/`.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/refresh-access-token` | No | Refresh an expired access token |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/sign-up` | No | Register a new user (starts as inactive editor) |
| POST | `/sign-in` | No | Authenticate and receive JWT tokens |
| GET | `/users` | Yes | List all users |
| PUT | `/upload-avatar/:id` | Yes | Upload user avatar image (png/jpg) |
| GET | `/get-avatar/:avatarName` | No | Retrieve avatar image file |
| PUT | `/update-user/:id` | Yes | Update user profile |
| PUT | `/activate-user/:id` | Yes | Activate or deactivate a user |
| DELETE | `/delete-user/:id` | Yes | Delete a user and their avatar |
| POST | `/sign-up-admin` | Yes | Create an admin-activated user with custom role |

### Menu

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/add-menu` | Yes | Create a menu item |
| GET | `/get-menus` | No | Get all menu items (sorted by order) |
| PUT | `/update-menu/:id` | Yes | Update a menu item |
| PUT | `/activate-menu/:id` | Yes | Toggle menu item active state |
| DELETE | `/delete-menu/:id` | Yes | Delete a menu item |

### Contact

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/contact-me` | No | Submit a contact form (rate-limited per email) |
| GET | `/get-contact-messages-unread` | Yes | Get messages filtered by read status |
| PUT | `/check-contact-message/:id` | Yes | Mark a message as read/unread |
| DELETE | `/delete-contact-message/:id` | Yes | Delete a contact message |
| GET | `/get-last-message-email` | Yes | Get email of the most recent unread message |

### Education

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/add-course` | Yes | Create a new course |
| GET | `/get-courses` | No | Get paginated courses (query: `page`, `limit`) |
| GET | `/get-course/:url` | No | Get a single course by URL slug |
| GET | `/get-next-course/:url` | No | Get the next course URL in sequence |
| GET | `/get-prev-course/:url` | No | Get the previous course URL in sequence |
| PUT | `/update-course/:id` | Yes | Update course details |
| PUT | `/upload-image/:id` | Yes | Upload course image (auto-generates thumbnail) |
| PUT | `/add-tag/:id` | Yes | Add a tag to a course |
| DELETE | `/delete-tag/:id` | Yes | Remove a tag from a course |
| GET | `/get-image/:imageName` | No | Retrieve course image file |
| DELETE | `/delete-course/:id` | Yes | Delete a course and its images |

### About Me

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/add-about-me-info` | Yes | Create an about me entry |
| GET | `/get-about-me-info/:title` | No | Get about me content by title |
| PUT | `/update-about-me-info/:title` | Yes | Update about me content |

### Utils

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/connection` | No | Health check (returns 200) |
| GET | `/messages-status` | No | Get current message reload flag |
| POST | `/reload-messages/:haveToReload` | No | Set message reload flag |
| POST | `/create-reload-messages` | No | Initialize reload messages util record |
| POST | `/create-indexeddb-version` | No | Initialize IndexedDB version record |
| GET | `/get-indexeddb-version` | No | Get current IndexedDB version number |
| PUT | `/update-indexeddb-version` | No | Increment IndexedDB version by 1 |

## WebSocket Events

The server emits a `getMessagesLength` event every 5 seconds per connected client, containing the count of unread contact messages.

## Environment Variables

### Development (`.env.development`)

| Variable | Description | Default |
|----------|-------------|---------|
| `API_VERSION` | API version prefix (used in route paths) | `v1` |
| `IP_SERVER` | Server bind address | `127.0.0.1` |
| `IP_MONGO_DB` | MongoDB host address | `127.0.0.1` |
| `PORT_MONGO_DB` | MongoDB port | `27019` |
| `DB_NAME` | MongoDB database name | `dtpf` |
| `PORT_SERVER` | Express server port | `3998` |
| `SECRET_KEY` | JWT signing secret | - |

### Production (`.env.production`)

Same as development, plus:

| Variable | Description |
|----------|-------------|
| `DB_USER_PASSWORD` | MongoDB auth credentials (format: `user:password`) |

## License

MIT
