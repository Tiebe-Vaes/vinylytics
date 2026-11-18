# Vinylytics

**Your Spotify history, pressed as records.**

Vinylytics turns your listening history into eras based on the artists you played most each week. Browse your Shelf, find an artist or track, and turn a favourite listening story into a card you can send.

- **Shelf** · Open, rename, and merge eras. Share an era as a post or story, with eight inks and five levels of detail.
- **Charts** · Rank artists, tracks, and albums by plays or time. Search your library and open individual music pages.
- **Recap** · Pick a year and explore your favourite music, listening patterns, and daily calendar.
- **History** · Browse listening days and open any day for its play log.
- **Import** · Add Spotify Extended streaming history and merge it with recent syncs without counting plays twice.
- **Public page** · Choose which sections to show at `/u`. It starts off, and your play log stays private.

Each installation connects to one owner’s Spotify account and database. Spotify requires the owner of a development-mode app to have Premium. [Spotify quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)

## Set up your own copy

Choose **Docker** to run the app and database on your own machine, or **Vercel with Neon** to host them online. Both paths use the same Spotify app.

### Create your Spotify app

1. Open the Spotify Developer Dashboard, sign in with the Premium account you want to use, and select **Create app**. Give it a name such as “My Vinylytics”, select **Web API**, and save. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Enter a callback address. For Docker on this computer, use `http://127.0.0.1:3000/api/auth/callback`. For a hosted copy, use its HTTPS address followed by `/api/auth/callback`. If Vercel has yet to assign the address, register the loopback callback and add the hosted callback after the first deployment. Spotify matches the full address, including the scheme, port, and path. [Spotify redirect rules](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)
3. In the app's **Settings**, copy **Client ID** and reveal **Client secret**. Keep the secret in your deployment settings or password manager.
4. Open your Spotify profile, select **Share → Copy link to profile**, and take the part after `/user/` and before any `?`. This is your owner ID. Enter it before your first sign-in to pin the installation to your account.

### Generate two secrets

Run the command twice and save the outputs separately. Use one for `AUTH_SECRET` and the other for `CRON_SECRET`.

**Windows PowerShell**

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
[Convert]::ToBase64String($bytes)
```

**macOS or Linux**

```sh
openssl rand -base64 32
```

### Option A · Docker

1. Install and start Docker Desktop or Docker Engine with the Compose plugin. Clone or download this repository and open a terminal in the folder that contains `docker-compose.yml`.
2. Copy the example configuration. On Windows run `Copy-Item .env.example .env` in PowerShell. On macOS or Linux run `cp .env.example .env`.
3. Open the new `.env` in a text editor and fill in the Spotify values and both generated secrets from the [table below](#environment-variables). Leave `DATABASE_URL` blank so Compose can use its own Postgres service.
4. Run `docker compose up -d --build`. Then run `docker compose ps` and look for the running app and healthy database. If the app restarts repeatedly, run `docker compose logs --tail=50 app`.
5. Open `http://127.0.0.1:3000`, sign in with Spotify, and choose **Settings → Sync now**. The connection status and last-sync time should update. The Compose cron service makes subsequent sync attempts every 30 minutes.

For access from another machine, put the app behind an HTTPS reverse proxy and register the exact HTTPS callback in Spotify and `.env`. After changing environment values, run `docker compose up -d`. Back up the database before upgrading, then pull the new source and run `docker compose up -d --build`.

### Option B · Vercel with Neon

1. Fork this repository on GitHub. In Vercel, select **Add New → Project** and import your fork.
2. Create a Neon Postgres database. Connect it through the Vercel integration or copy the connection string from Neon's **Connect** dialog into the Vercel project's **Settings → Environment Variables** as `DATABASE_URL`.
3. Add the Spotify credentials, owner ID, two generated secrets, and callback URI from the [table below](#environment-variables) to the **Production** environment. Use the registered loopback callback for the first build if the hosted address is pending. Give Preview its own Neon branch or disable automatic preview deployments. The build command applies database migrations.
4. Deploy. Copy the Production HTTPS address from the deployment, add `/api/auth/callback`, and register that full URI in Spotify. Set the same URI as the Production `SPOTIFY_REDIRECT_URI` in Vercel, then redeploy.
5. In your GitHub fork, open **Settings → Secrets and variables → Actions**. Add `APP_URL` with the Production base address without a trailing slash, and `CRON_SECRET` with the exact value from Vercel.
6. Sign in on the Production address. Go to **Actions → Spotify sync → Run workflow** and verify the run succeeds and the app shows a last-sync time. Enable Actions on your fork if prompted. [Run a GitHub workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)

When changing a Vercel environment value, redeploy the affected environment. When rotating `CRON_SECRET`, update GitHub Actions too. Keep a Neon backup or restore point before updating from upstream.

### Environment variables

Put these in the copy of `.env` next to `docker-compose.yml`, or in Vercel's Production environment.

| Name | Where to get it |
|---|---|
| `SPOTIFY_CLIENT_ID` | Spotify app **Settings → Client ID**. |
| `SPOTIFY_CLIENT_SECRET` | Spotify app **Settings → Client secret**. Keep private. |
| `SPOTIFY_REDIRECT_URI` | The exact registered callback URI, ending in `/api/auth/callback`. |
| `OWNER_SPOTIFY_ID` | Your Spotify profile link. Set before sign-in. |
| `AUTH_SECRET` | First generated secret. Signs sessions. Rotating it signs everyone out. |
| `CRON_SECRET` | Second generated secret. Compose passes it to the app and cron service from the same file. On Vercel, save the same value in GitHub Actions. |
| `DATABASE_URL` | Compose supplies this automatically. Vercel uses Neon’s Postgres connection string. Keep it private. |
| `TIMEZONE` | Optional IANA time zone such as `Europe/Brussels`. Defaults to `UTC`. |
| `LASTFM_API_KEY` | Optional key from your Last.fm API account for genre tags. Keep private. |

### Import your listening history

Request **Extended streaming history** from your Spotify account’s privacy settings. When the ZIP arrives, open Vinylytics and go to **Settings → Import history**. Select the ZIP (or its `Streaming_History_Audio_*.json` files). The app parses it in your browser and uploads only the fields needed for listening statistics, never your IP address, country or device.

- **Keep the tab open while it says Preparing.** If you close or reload it during that step, choose the files again.
- **Once it says Saving, you can browse other pages.** Progress stays visible in the corner. If you reload or close the tab, the upload resumes from the last saved batch when you open Vinylytics again in the same browser.
- **Pause, Resume and Cancel** sit next to the progress bar. Cancelling keeps the plays already saved.
- **One import at a time.** A second tab shows that the import runs elsewhere and takes over if the first tab closes.
- **Importing the same export again is safe.** Plays already stored are skipped.

When the upload finishes, artwork and genres keep filling in in the background.

### Troubleshooting

| What you see | What to check |
|---|---|
| Spotify rejects the callback | Compare the complete URI in Spotify and your environment. Open the app at the same origin. On local Docker, use the numeric loopback address. |
| Wrong account or failed sign-in | Compare the profile ID with `OWNER_SPOTIFY_ID`, confirm the app owner's Premium status, and sign in with that same account. |
| No recent plays | Play a track, choose **Sync now**, and check the Spotify connection status. On Docker, inspect `docker compose logs --tail=30 cron`. On GitHub, check the **Spotify sync** run and both Actions secrets. |
| Build or startup fails | Check the app logs. On Vercel, confirm the database URL is set for the environment being built. On Docker, check that the database service is healthy and that port 3000 is free. |

### Ask an AI coding agent to guide setup

Copy this into an agent that has access to your repository:

> Help me set up Vinylytics in this checkout. Inspect README.md, .env.example, package.json, Docker and Vercel configuration, and the sync workflow. Identify my OS and installed tools, then ask whether I want Docker or Vercel with Neon if you cannot infer it. Give me one step at a time and tell me what I should see before continuing. Use current official docs if dashboard steps have changed. You can prepare local config with placeholders and verify commands and status. Guide me through the Spotify, Vercel, Neon and GitHub dashboard actions I need to perform myself. Let me enter all credentials directly in the local file or dashboard. Keep secrets, tokens, database connection strings, and my listening history out of chat, logs and Git. Verify sign-in, sync and import with me, and report anything still pending.

## Develop

```sh
npm ci
npm run dev:local
```

Local demo mode uses a separate database with synthetic plays. Use `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` to check a change.

## Credits and licence

Data from Spotify. Genre tags from Last.fm. Type by Big Shoulders and Archivo. MIT licence.
