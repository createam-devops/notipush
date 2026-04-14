# NotiPush

Multi-project push notification platform. Send web push notifications to your users with a simple API and JavaScript SDK.

## Architecture

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌────────────┐
│  Browser  │────▶│  Caddy   │────▶│  Go API      │────▶│ PostgreSQL │
│  (SDK)    │     │  (HTTPS) │     │  (chi/v5)    │     └────────────┘
└──────────┘     │          │     └──────┬───────┘
                  │          │            │ publish
┌──────────┐     │          │     ┌──────▼───────┐
│  Next.js  │◀───│          │     │  NATS        │
│  Dashboard│     └──────────┘     │  JetStream   │
└──────────┘                      └──────┬───────┘
                                         │ consume
                                  ┌──────▼───────┐
                                  │  Go Worker   │──▶ Web Push API
                                  └──────────────┘
```

**Stack:** Go 1.22 · PostgreSQL 16 · NATS JetStream · Next.js · Tailwind · Caddy

## Quick Start (Development)

### Prerequisites

- Go 1.22+
- Node.js 20+
- Docker & Docker Compose

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL and NATS.

### 2. Generate VAPID keys

```bash
cd notipush-api
go run ./cmd/vapidgen
```

Copy the output into a `.env` file at the project root (see `.env.example`).

### 3. Start the API

```bash
cd notipush-api
go run ./cmd/api
```

The API runs on `http://localhost:8080`. Migrations run automatically on startup.

### 4. Start the Worker

```bash
cd notipush-api
go run ./cmd/worker
```

### 5. Start the Dashboard

```bash
cd notipush-web
npm install
npm run dev
```

The dashboard runs on `http://localhost:3000`.

## Production Deployment

Only **3 files** are needed on your VPS:

```
/opt/notipush/
├── docker-compose.prod.yml
├── Caddyfile
└── .env
```

### 1. Prepare the server

```bash
mkdir -p /opt/notipush
# Copy docker-compose.prod.yml, Caddyfile, and .env to this folder
```

### 2. Configure `.env`

Copy `.env.example` → `.env` and fill in all values:

```bash
# Domain
DOMAIN=notipush.createam.io
DOMAIN_API=notipush-api.createam.io

# Database (use a strong password)
DB_PASSWORD=your_strong_password_here

# Generate these:
#   VAPID keys:   docker compose -f docker-compose.prod.yml run --rm api /app/vapidgen
#   AUTH_SECRET:   openssl rand -base64 32
#   ADMIN_SECRET:  openssl rand -base64 32

# OAuth (register at Google Cloud Console / GitHub Developer Settings)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### 3. DNS

Point your domain to the VPS IP address (A record).

### 4. Deploy

```bash
cd /opt/notipush
docker compose -f docker-compose.prod.yml up -d
```

Caddy automatically obtains an SSL certificate via Let's Encrypt.

### 5. Verify

```bash
curl https://yourdomain.com/health
# {"status":"ok"}
```

## SDK Integration

Add the service worker to your site's root:

```html
<script src="https://yourdomain.com/sdk/notipush.js"></script>
<script>
  NotiPush.init({
    serverUrl: 'https://yourdomain.com',
    apiKey: 'YOUR_PROJECT_API_KEY',
    appId: 'YOUR_APP_ID',
    vapidPublicKey: 'YOUR_VAPID_PUBLIC_KEY',
    userId: 'user-123',
    topics: ['news', 'offers'],  // optional
    swPath: '/sw.js'             // optional, default: /sw.js
  }).then(subscription => {
    console.log('Subscribed:', subscription);
  });
</script>
```

Copy `sdk/sw.js` to your site's root so it's accessible at `/sw.js`.

## API Reference

### Admin endpoints (require `ADMIN_SECRET`)

| Method | Path               | Description       |
|--------|--------------------|-------------------|
| POST   | `/admin/projects`  | Create project    |
| GET    | `/admin/projects`  | List projects     |

Header: `Authorization: Bearer <ADMIN_SECRET>`

### Project endpoints (require API key)

| Method | Path                                       | Description              |
|--------|-------------------------------------------|-----------------------   |
| GET    | `/api/v1/project`                         | Current project info     |
| POST   | `/api/v1/applications`                    | Create application       |
| GET    | `/api/v1/applications`                    | List applications        |
| DELETE | `/api/v1/applications/{id}`               | Delete application       |
| POST   | `/api/v1/applications/{id}/topics`        | Create topic             |
| GET    | `/api/v1/applications/{id}/topics`        | List topics              |
| DELETE | `/api/v1/topics/{id}`                     | Delete topic             |
| POST   | `/api/v1/applications/{id}/subscribe`     | Subscribe user           |
| GET    | `/api/v1/applications/{id}/subscriptions` | List subscriptions       |
| POST   | `/api/v1/notifications/send`              | Send notification        |
| GET    | `/api/v1/notifications`                   | List notifications       |
| GET    | `/api/v1/notifications/{id}`              | Notification details     |

Header: `X-API-Key: <project_api_key>`

### Send notification body

```json
{
  "app_id": "uuid",
  "topic_id": "uuid (optional, targets topic subscribers only)",
  "title": "Hello!",
  "body": "You have a new message",
  "url": "https://example.com",
  "icon": "https://example.com/icon.png",
  "priority": "normal",
  "ttl": 86400
}
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) automatically:

1. Runs Go tests
2. Runs Next.js build
3. Builds & pushes Docker images to Docker Hub
4. Deploys to VPS via SSH

Set these GitHub secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `SSH_HOST`, `SSH_USER`, `SSH_KEY`.

## Project Structure

```
notipush/
├── notipush-api/           # Go backend
│   ├── cmd/
│   │   ├── api/            # HTTP server
│   │   ├── worker/         # NATS consumer + push sender
│   │   └── vapidgen/       # VAPID key generator
│   ├── internal/
│   │   ├── broker/         # NATS JetStream client
│   │   ├── config/         # Environment config
│   │   ├── db/             # PostgreSQL repos + migrations
│   │   ├── handler/        # HTTP handlers
│   │   ├── middleware/     # Auth, rate limiting, CORS
│   │   ├── models/         # Data models
│   │   ├── push/           # WebPush sender
│   │   └── vapid/          # VAPID key generation
│   └── migrations/         # SQL schema
├── notipush-web/           # Next.js dashboard
│   └── src/
│       ├── app/            # Pages (App Router)
│       ├── components/     # UI components (shadcn)
│       ├── contexts/       # React context (project state)
│       └── lib/            # API client, auth config
├── sdk/                    # Browser SDK + service worker
├── Caddyfile               # Reverse proxy config
├── docker-compose.yml      # Development (Postgres + NATS)
└── docker-compose.prod.yml # Production (full stack)
```

## License

MIT
