# CampusVault — Setup

A private OA-questions platform for NIT Srinagar students. Files live in Google
Drive (owned by a Service Account, ownership hidden). The web app proxies bytes
through short-lived view tokens so the browser never sees a Drive URL.

## 1. Prereqs

- Node 20+ (you have v24, perfect)
- A Google account
- A Turso account (free): https://turso.tech

## 2. Install

```bash
npm install
cp .env.example .env
```

Fill out `.env` as you complete the steps below.

## 3. Google Cloud: OAuth client (for student login)

1. Go to https://console.cloud.google.com → create a new project, e.g. `campusvault`.
2. APIs & Services → **OAuth consent screen**
   - User Type: **External**
   - App name: `CampusVault`, support email: yours
   - Scopes: leave default (just `email`, `profile`, `openid`)
   - Test users: add your own `@nitsri.ac.in` email so you can sign in before the app is verified
3. APIs & Services → **Credentials** → **+ Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `https://<your-prod-domain>` (later)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://<your-prod-domain>/api/auth/callback/google` (later)
4. Copy the **Client ID** and **Client secret** into `.env`:
   ```
   AUTH_GOOGLE_ID=...
   AUTH_GOOGLE_SECRET=...
   ```

> **Why this survives graduation:** this OAuth client lives in your personal
> Google Cloud project, not NIT Srinagar's Google Workspace. As long as the
> college keeps the `nitsri.ac.in` domain alive (it will), the check works
> regardless of who admins the workspace.

## 4. Google Cloud: Service Account (for storing Drive files)

In the **same** GCP project:

1. APIs & Services → **Library** → enable **Google Drive API**.
2. IAM & Admin → **Service Accounts** → **+ Create**
   - Name: `pyqs-storage`
   - Grant nothing at the project level — its only "permission" will be on the Drive folder.
3. Open the new SA → **Keys** → **Add Key** → **Create new key** → JSON. Save the file.
4. Encode and paste:
   ```bash
   cat pyqs-storage-*.json | base64 -w0
   ```
   Put the result in `.env` as `DRIVE_SA_KEY_B64=...`. **Then delete the JSON file from disk.**
5. In your personal Google Drive, create a folder called `CampusVault storage`.
   Open the folder → Share → invite the SA's email
   (`pyqs-storage@<project>.iam.gserviceaccount.com`) as **Editor**.
6. Open the folder URL in the browser; copy the folder ID from the URL:
   ```
   https://drive.google.com/drive/folders/<THIS_PART>
   ```
   Paste it as `DRIVE_PARENT_FOLDER_ID=...` in `.env`.

> The SA *owns* every file it uploads. Your personal name never appears on the
> file. If you ever leave the project, transfer the folder ownership to a new
> trusted account — the SA continues to function regardless.

## 5. Turso (metadata DB)

```bash
# Install Turso CLI (one-time)
curl -sSfL https://get.tur.so/install.sh | bash

turso auth signup        # or login
turso db create pyqs
turso db show pyqs --url           # → DATABASE_URL
turso db tokens create pyqs        # → DATABASE_AUTH_TOKEN
```

Paste both into `.env`. For local-only dev you can skip Turso and leave the
default `DATABASE_URL=file:./local.db`.

## 6. Generate secrets

```bash
openssl rand -base64 32   # → AUTH_SECRET
openssl rand -base64 32   # → VIEW_TOKEN_SECRET
openssl rand -base64 32   # → CRON_SECRET
```

## 7. Set admins

In `.env`:
```
ADMIN_EMAILS=sunam_2022bcse039@nitsri.ac.in,<other admin emails>
```
First time a matching email signs in, that user is promoted to `admin`.

## 8. Migrate and run

```bash
npm run db:generate     # produce SQL migrations from db/schema.ts
npm run db:migrate      # apply them to DATABASE_URL
npm run dev             # → http://localhost:3000
```

Visit http://localhost:3000, click "Continue with Google", sign in with your
`@nitsri.ac.in` account. Try a non-college Gmail account → modal appears with
the rejection message.

## 9. Deploy (Vercel + Cloudflare)

1. Push to GitHub. New Vercel project → import the repo.
2. Set every `.env` variable in **Settings → Environment Variables** (Production).
3. After first deploy: add your Vercel domain (`<project>.vercel.app`) to the
   OAuth client's Authorized redirect URIs.
4. (Optional, recommended) Put Cloudflare in front:
   - Add the custom domain to Cloudflare → CNAME to Vercel.
   - Enable: WAF managed rules, Bot Fight Mode, "Always Use HTTPS", HSTS.
   - Add a Page Rule: cache `/api/files/stream/*` only for very short TTL (or
     bypass) since tokens are single-use.

## 10. Verify the leak-proofing

After deploy, with a logged-in account:

- Open an OA file. DevTools → Network → confirm:
  - No request goes to `drive.google.com` from the browser.
  - The stream URL is `/api/files/stream/<opaque-token>`.
- Copy that stream URL, open a private window (logged out) → request rejected.
- Wait 90 seconds, refresh the original stream URL → 403 (expired + already consumed).
- View source on the OA page → no Drive IDs, only internal UUIDs.
- Right-click on the viewer → context menu blocked.
- Watermark with your email visible diagonally across the file.

## 11. Operational checklist

- [ ] Rotate `AUTH_SECRET` and `VIEW_TOKEN_SECRET` yearly.
- [ ] Rotate the SA key yearly (create new key, update env, delete old key).
- [ ] Monthly: review `audit_log` for anomalies (mass downloads, off-hours
      activity, single user pulling many files).
- [ ] Quarterly: prune `view_tokens` table (`purgeExpiredTokens()` — wire to a
      Vercel Cron).
- [ ] When students graduate, decide: keep their access as alumni (read-only),
      or block (`isBlocked=true`).

## 12. What this stack does NOT do

Read this honestly:

- **Can't prevent screen capture / screenshot tools / phone cameras.** The
  watermark + audit log is the realistic deterrent — leakers are identifiable.
- **Can't prevent a determined user from DevTools-saving the proxy bytes.** The
  single-use 60s token shortens the window, but bytes that render must travel.
  The watermark still gets baked into anything they capture.
- **Casual sharing is what the architecture defeats.** That's ~98% of real-world
  leak risk for student platforms.
