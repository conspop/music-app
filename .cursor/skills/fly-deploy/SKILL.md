---
name: fly-deploy
description: Deploy and manage applications on Fly.io — configure fly.toml, set up volumes for SQLite, manage secrets, and run deployments. Use when deploying to Fly.io, configuring fly.toml, creating volumes, or managing production infrastructure.
---

# Fly.io Deployment

## Initial Setup

Scaffold the app with `fly launch`. This detects your Dockerfile and generates `fly.toml`:

```bash
fly launch
```

Review and tweak the generated config before the first deploy.

## fly.toml Configuration

Minimal config for a Node.js app with SQLite on a persistent volume:

```toml
app = "your-app-name"
primary_region = "ord"
kill_signal = "SIGTERM"
kill_timeout = 30

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"
  DATABASE_URL = "file:///data/sqlite.db"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1

  [http_service.concurrency]
    type = "requests"
    soft_limit = 200
    hard_limit = 250

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  timeout = "5s"
  path = "/health"

[mounts]
  source = "data"
  destination = "/data"
  auto_extend_size_threshold = 80
  auto_extend_size_increment = "1GB"
  auto_extend_size_limit = "10GB"

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

Key points:
- `[mounts]` attaches a persistent volume at `/data` so SQLite survives deploys.
- `auto_extend_size_*` settings let the volume grow automatically.
- `min_machines_running = 1` keeps the app warm (no cold starts).
- Health check at `/health` — the app must expose this endpoint.

## Volumes

Create a volume before the first deploy:

```bash
fly volumes create data --region ord --size 1
```

The volume name (`data`) must match `[mounts].source` in `fly.toml`. Only one Machine can attach to a volume at a time — this is fine for a single-server SQLite architecture.

## Secrets

Set environment variables that should not be in `fly.toml`:

```bash
fly secrets set SESSION_SECRET="..." GOOGLE_CLIENT_ID="..." GOOGLE_CLIENT_SECRET="..." OPENAI_API_KEY="..."
```

Access these in the app via `process.env` as usual.

## Deploying

```bash
fly deploy
```

This builds the Docker image remotely and rolls out to your Machines. To deploy a specific Dockerfile:

```bash
fly deploy --dockerfile ./Dockerfile
```

## Scheduled Tasks (Cron)

Fly.io does not have built-in cron. Options for the nightly ingestion job:

1. **In-process scheduler** — use a library like `node-cron` inside the app process. Simplest for a single-Machine setup.
2. **Fly Machines API** — create a separate Machine that runs on a schedule via `fly machine run --schedule`.
3. **External trigger** — GitHub Actions or similar hits an authenticated endpoint.

For this project, option 1 (in-process scheduler) is recommended since we run a single Machine.

## Useful Commands

| Command | Purpose |
|---|---|
| `fly status` | Check app and Machine status |
| `fly logs` | Tail production logs |
| `fly ssh console` | SSH into the running Machine |
| `fly volumes list` | List volumes and usage |
| `fly secrets list` | List set secrets (names only) |
| `fly scale show` | Show current VM size and count |
