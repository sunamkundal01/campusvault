# CampusVault — NIT Srinagar

A private, login-gated archive of past **Online Assessments**, **interview experiences**, and **placement data** — built by and for NIT Srinagar students.

Domain-locked to `@nitsri.ac.in`. Files live on Google Drive (owned by a Service Account); the platform proxies every byte through short-lived single-use tokens so the browser never sees a Drive URL. Every view is watermarked with the viewer's email and audit-logged.

## Highlights

- **Auth-gated** — Google sign-in restricted to `@nitsri.ac.in` server-side. Independent of any Workspace admin; survives graduation.
- **Drive-backed storage** — files owned by a Service Account, fetched via Drive API, proxied through the app. The browser never sees `drive.google.com`.
- **Single-use view tokens** — IP-bound JWTs, 60-second TTL, marked consumed after one use. No re-share.
- **Watermark + audit** — every rendered page tiles the viewer's email diagonally; every view writes an `audit_log` row.
- **Community uploads** — any signed-in student can contribute. Files stream through a backend proxy, sniffed for MIME, rate-limited and quota-enforced.
- **Interview experiences** — admin-curated YouTube videos (embedded) + author-attributed blog posts from any user.
- **Placement data** — CTC, CGPA cutoffs, MTech eligibility — separate `placement_entries` table, populated via a community form.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, RSC) |
| Auth | Auth.js (NextAuth v5) + Google provider |
| Database | Turso (libSQL) via Drizzle ORM |
| File storage | Google Drive (Service Account) |
| Streaming | Custom proxy with `jose` JWT view tokens |
| UI | Tailwind v3 + shadcn/ui primitives + Lucide icons |
| PDF / ZIP rendering | `pdfjs-dist`, `jszip` (all client-side, in a watermarked surface) |
| Hosting | Vercel |

## Quick start (local development)

```bash
npm install
cp .env.example .env       # fill in values (see Environment below)
npm run db:generate        # produce Drizzle migrations from db/schema.ts
npm run db:migrate         # apply migrations to your DATABASE_URL
npm run dev                # http://localhost:3000
```

Open <http://localhost:3000> and click **Continue with Google**. Sign in with an `@nitsri.ac.in` email. Try a non-college email — you'll see the domain rejection modal.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start dev server with HMR |
| `npm run dev:fresh` | Clear `.next` first, then dev (use when cache acts up) |
| `npm run clean` | Just clear `.next` |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run db:generate` | Generate SQL migrations from `db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:studio` | Open Drizzle Studio in browser |
| `npm run db:seed:companies` | Bulk-import companies from `scripts/data/companies-seed.tsv` |
| `npm run db:seed:companies-2` | Second seed (Incubyte-style format) |
| `npm run db:cleanup:companies` | Merge name-variants, delete junk, title-case |
| `npm run db:cleanup:dupe-links` | Remove duplicate links for the same company |

## Environment

All keys are documented in `.env.example`. The required ones:

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | NextAuth JWT signing key (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | OAuth client from Google Cloud Console |
| `ALLOWED_EMAIL_DOMAIN` | `nitsri.ac.in` |
| `ADMIN_EMAILS` | Comma-separated admin allowlist |
| `DRIVE_SA_KEY_B64` | Service-account JSON, base64-encoded one line |
| `DRIVE_PARENT_FOLDER_ID` | Drive folder shared with the SA (Editor) |
| `VIEW_TOKEN_SECRET` | Independent secret for file view tokens (`openssl rand -base64 32`) |
| `DATABASE_URL` | `libsql://<your-db>.turso.io` (or `file:./local.db` for dev) |
| `DATABASE_AUTH_TOKEN` | Turso token (empty for local SQLite) |

`SETUP.md` walks through Google Cloud / Service Account / Turso step-by-step.

## Project structure

```
app/
  (auth)/              Public landing page (/login), terms, unauthorized
  (app)/               Authenticated app shell — gated by middleware
    page.tsx                Dashboard
    explore/                Unified Placement + OA feed
    companies/              Company directory + detail
    oa/[id]/                OA viewer (PDF / image / ZIP / watermark)
    interviews/             Videos + blogs
    contribute/             Upload form
    my-uploads/             User's contributions
    admin/                  Moderation, users, audit
  api/                 Route handlers (file token + stream, uploads,
                       interviews, placements, admin moderation, etc.)
components/
  ui/                  shadcn primitives (Button, Card, Dialog, …)
  viewer/              PDF/Image/ZIP viewers + watermark overlay
  app-shell.tsx        Sidebar + main layout
  app-footer.tsx       Site footer
  company-avatar.tsx   Deterministic gradient monogram
  company-logo.tsx     Real-favicon component with monogram fallback
db/
  schema.ts            Drizzle schema (all tables)
  migrations/          Generated SQL
lib/
  auth.ts              NextAuth + domain-check callback
  drive.ts             Drive service-account client + Range-aware streamer
  tokens.ts            View-token sign/verify (jose + DB-backed jti)
  colleges.ts          IIT/NIT/IIIT enum
  company-logos.ts     Name → domain mapping for logo fetcher
  quotas.ts            Per-user upload quotas
  rate-limit.ts        In-process LRU rate limiter
  audit.ts             Audit log writer
middleware.ts          Auth + admin gating
scripts/               Migrations, seeds, cleanup
```

## Deploying to Vercel

This repo is designed to deploy on Vercel's Hobby (free) tier.

1. **Push to GitHub** (instructions in the next section if you haven't already).
2. Sign in to <https://vercel.com> with the same GitHub account.
3. Click **Add New → Project** and import the repo.
4. **Framework Preset**: Next.js (auto-detected). Leave build settings as default.
5. **Environment Variables** — add every key from `.env` (copy the values exactly). For production:
   - `AUTH_SECRET` and `VIEW_TOKEN_SECRET` — generate fresh ones (`openssl rand -base64 32`).
   - `DATABASE_URL` and `DATABASE_AUTH_TOKEN` — same Turso DB you used in dev (or create a separate prod DB).
   - Everything else — same values as `.env`.
6. Click **Deploy**. First build takes ~2 minutes.
7. After deploy, your URL is `https://<project>.vercel.app`. Open it — you'll get a Google OAuth error on first sign-in because Google doesn't know about the new URL yet.
8. **Update Google OAuth** (this is the only post-deploy step):
   - <https://console.cloud.google.com> → APIs & Services → Credentials → click your OAuth client.
   - Under **Authorized redirect URIs**, add:
     `https://<project>.vercel.app/api/auth/callback/google`
   - Under **Authorized JavaScript origins**, add:
     `https://<project>.vercel.app`
   - Save. Sign-in now works in production.

That's it. Future pushes to your `main` branch auto-deploy.

### Custom domain (optional)

In Vercel → Project → Settings → Domains, add your domain (e.g. `pyqs.example.in`). Vercel walks you through the DNS records. Then re-add the same OAuth redirect URI under the new domain.

### Database for production

You're already on Turso, which deploys "in place" — your dev DB is the same as prod by default. If you want separate dev/prod databases:

```bash
turso db create pyqs-prod
turso db show pyqs-prod --url           # → DATABASE_URL in Vercel
turso db tokens create pyqs-prod        # → DATABASE_AUTH_TOKEN in Vercel
```

Apply migrations to it once: temporarily point your local `.env` at the prod URL, then `npm run db:migrate`. Switch back.

### Verifying the deploy

Run through this checklist after first deploy:

- [ ] Visit landing page → renders, stats show real counts.
- [ ] Click **Continue with Google** → completes sign-in.
- [ ] Try signing in with a non-`@nitsri.ac.in` email → modal explains "use your college email".
- [ ] Open any OA → file streams in the watermarked viewer (your email visible diagonally).
- [ ] DevTools → Network → confirm no request goes to `drive.google.com`.
- [ ] The stream URL is `/api/files/stream/<opaque-token>`.
- [ ] `robots.txt` returns `Disallow: /`.

## Security stance

- Auth domain check runs in the `signIn` callback **on every login** — Google Workspace admin lockout doesn't affect us.
- View tokens are single-use (DB-backed `jti`), 60s TTL, IP-bound (hashed).
- All file streams set: `Cache-Control: private, no-store`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`, `CSP: default-src 'none'`, `Content-Disposition: inline` (never `attachment`).
- Watermark is data-URI SVG with the viewer's email tiled diagonally over every viewer surface.
- Every login, file view, upload, and admin action writes to `audit_log` (with hashed IP).
- File uploads are MIME-sniffed server-side, not trusted from the client.
- Per-user quotas: 500 MB total, 20 uploads/day, 25 MB/file PDF, 5 MB/image, 100 MB/ZIP.

## License

Private — built for NIT Srinagar internal use. Not licensed for redistribution.

---

Built by Sunam Kundal. If you're a NIT Srinagar student and want to contribute or report something, reach out via your college email after signing in.
