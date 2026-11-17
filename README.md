# Discography

Your Spotify listening history, on your own server. Each copy serves one person: you deploy it, you sign in with Spotify, and nobody else can.

> This is the setup guide. Screenshots and the full tour come later.

## 1. Create a Spotify app

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and create an app. The account that owns the app needs Spotify Premium.
2. Add a redirect URI:
   - Deployed: `https://<your-app>/api/auth/callback`
   - Local: `http://127.0.0.1:3000/api/auth/callback`. Spotify rejects `localhost`.
3. Tick **Web API**.
4. Copy the client ID and client secret.

**Never add other people to your Spotify app's user list.** In development mode only listed accounts can sign in to your app. You are listed automatically, so that list is what keeps your copy yours.

## 2. Deploy

### Vercel and Neon

1. Fork this repo.
2. Import the fork in Vercel.
3. Add a Neon Postgres database from the Vercel marketplace. It sets `DATABASE_URL`.
4. Set the environment variables from the table below.
5. Set the build command to `npm run vercel-build`. It applies the database migrations, then builds.
6. Deploy, open the app and sign in with Spotify. The first account to sign in becomes the owner.
7. In your fork, go to **Settings → Secrets and variables → Actions** and add two secrets:
   - `APP_URL`: your app's address, for example `https://discography-you.vercel.app`.
   - `CRON_SECRET`: the same value as in Vercel.

   The `Spotify sync` workflow then pulls new plays every 30 minutes. GitHub pauses scheduled workflows after 60 days without commits. Re-enable it in the Actions tab if that happens.

### Docker

```bash
cp .env.example .env
```

Fill in `.env`, leaving `DATABASE_URL` empty because compose sets it. Then:

```bash
docker compose up -d --build
```

This starts the app on port 3000 with Postgres 17 and a small job that syncs every 30 minutes. The first start applies the migrations.

## 3. Import your full history

The live sync only sees plays from the moment you connect. For everything before that:

1. Go to spotify.com → **Account → Privacy**.
2. Request **Extended streaming history**. It can take up to 30 days to arrive.
3. Drop the zip on the **Import** page.

The file is read in your browser. Only the plays are uploaded, never your IP, country or device.

## Environment variables

| Variable | Required | What it is |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (Postgres 15 or newer) |
| `SPOTIFY_CLIENT_ID` | yes | From your Spotify app |
| `SPOTIFY_CLIENT_SECRET` | yes | From your Spotify app |
| `SPOTIFY_REDIRECT_URI` | yes | Must match the app's redirect URI exactly |
| `AUTH_SECRET` | yes | Signs your session. Generate with `openssl rand -base64 32` |
| `CRON_SECRET` | yes | Bearer token the sync job sends. Generate the same way |
| `OWNER_SPOTIFY_ID` | no | Your Spotify user id. When set, only this account can ever sign in |
| `TIMEZONE` | no | IANA name for day and hour stats, for example `Europe/Brussels`. Default `UTC` |
| `LASTFM_API_KEY` | no | Adds genre tags from Last.fm |

## Develop

```bash
npm install
npm run dev:local
```

This runs on a local in-process database with about 6,000 seed plays and no sign-in. Nothing touches a real database. Add `-- --reset` to wipe it.

Checks: `npx tsc --noEmit`, `npx eslint src`, `npx vitest run`, `npx next build`.

## Licence

MIT
