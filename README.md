# SRMAP EventSphere

Event management platform for SRM University AP. Students discover campus events, register in a couple of taps and carry a QR entry pass on their phone; organizers publish events, manage attendees and scan tickets at the door; administrators oversee users, events and registrations across the platform.

**Live application:** https://srmap-eventsphere.vercel.app

## Features

- **Event discovery:** search by title, venue or description; filter by category, price (free/paid) and date (upcoming/past); paginated results.
- **Registration with guaranteed capacity:** seats are reserved atomically in the database, so an event can never be oversold, even under concurrent requests. Duplicate registrations, registration after the deadline, and registration for draft, cancelled or started events are all rejected by the server.
- **QR tickets:** every registration gets a unique, unguessable ticket code (about 100 bits of entropy). The QR code contains only that code; everything else is looked up server-side.
- **Check-in:** organizers scan tickets with a phone camera or type the code. The check-in is recorded exactly once; repeat scans are flagged with the time of the first scan.
- **Paid events via Razorpay:** orders are created server-side for the event's stored price. A seat is held for 15 minutes during checkout, and payments are confirmed only after HMAC signature verification. A signed webhook confirms payments even if the student closes the browser. Without Razorpay keys, paid registration is disabled; it is never faked.
- **Dashboards backed by live data:** student upcoming events and history, organizer registrations/check-ins/revenue, and admin platform statistics with a 30-day registrations chart.
- **Attendee management:** search, manual check-in and CSV export (with spreadsheet formula-injection protection).
- **Event images:** JPEG/PNG/WebP up to 2 MB, validated by file signature, stored in the database and served with immutable caching.
- **Email confirmations** (optional) over SMTP.

## User roles

| Role | Can do |
| --- | --- |
| **Student** | Sign up, browse and search events, register, pay for paid events, view QR tickets, cancel free registrations before the event, view payment history, edit profile and password. |
| **Organizer** | Everything a visitor can see, plus: create events (saved as drafts), edit, upload cover images, publish/unpublish, cancel or delete events, view and export attendees, check tickets in, and see per-event and overall statistics. Organizers can only manage their **own** events. |
| **Admin** | Platform statistics; manage users (grant organizer/admin roles, deactivate/reactivate accounts); manage any event; view and cancel any registration. |

Public sign-up always creates a **student** account. Organizer and admin access is granted by an administrator.

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI primitives, TanStack Query, wouter, React Hook Form, Zod, Recharts, `qrcode` (ticket rendering), `qr-scanner` (camera check-in)
- **Backend:** Node.js, Express, TypeScript, Drizzle ORM, node-postgres, JSON Web Tokens in httpOnly cookies, bcrypt, Helmet, express-rate-limit, Razorpay SDK, Nodemailer
- **Database:** PostgreSQL (a managed Postgres such as Neon in production; Docker Postgres locally)
- **Testing and quality:** Vitest and Supertest against an in-process Postgres (PGlite), ESLint, strict TypeScript
- **Hosting:** Vercel (static frontend on the CDN, Express API as a serverless function in the Singapore region)

## Architecture

```
Browser ──► Vercel CDN ──► static React app (dist/public)
   │
   └── /api/* ──► Vercel serverless function (Express app, sin1) ──► PostgreSQL
                                   │
                                   ├──► Razorpay (orders; signed webhooks back in)
                                   └──► SMTP (optional confirmations)
```

- The frontend and API share one origin, so the session cookie is first-party (`SameSite=Lax`, `HttpOnly`, `Secure`) and no CORS is needed.
- `server/app.ts` builds the Express app. `server/index.ts` runs it as a normal Node server (local development, or any Node host); `server/vercel.ts` exports it as a serverless handler.
- `scripts/build-vercel.ts` produces Vercel's Build Output API layout: the static client, one bundled API function, SPA fallback routing, cache rules and security headers.
- Validation schemas in `shared/validation.ts` are used by both the API and the forms, so client and server rules never drift.

## Project structure

```
client/                 React application
  src/components/       Layout, shared UI and Radix-based primitives (components/ui)
  src/lib/              API client, auth hooks, formatting, Razorpay checkout loader
  src/pages/            Routes: events, auth, student, organizer, admin
server/
  app.ts                Express app: security middleware, routing, error handling
  auth.ts               Password hashing, session cookies, requireAuth / requireRole
  routes/               auth, events, registrations, payments, organizer, admin
  services/             Registration/seat logic, check-in, Razorpay, email
  config.ts, db.ts      Environment configuration and database connection
shared/
  schema.ts             Drizzle table definitions
  validation.ts         Zod request schemas shared with the client
  api.ts, constants.ts  API response types and shared enums
migrations/             SQL migrations generated by drizzle-kit
scripts/                migrate, create-admin, build-vercel
tests/                  API integration tests
```

## Local development

Requirements: Node.js 20.12+ and Docker (or any PostgreSQL 14+).

```bash
git clone https://github.com/AswarthaHarshitha/SRMAP-EventSphere.git
cd SRMAP-EventSphere
npm install

cp .env.example .env          # then set JWT_SECRET (see below)
docker compose up -d db       # PostgreSQL on localhost:5434
npm run db:migrate            # create the schema

# Create the first administrator (prompts for a password)
npm run create-admin -- --email you@srmap.edu.in --name "Your Name"

npm run dev                   # http://localhost:5000
```

Sign in as the administrator, open **Admin → Users**, and give organizer access to the accounts that should publish events.

## Environment variables

All configuration comes from environment variables; `.env.example` lists every one with safe placeholders. Never commit `.env`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. Use `sslmode=require` for hosted databases. |
| `JWT_SECRET` | yes | Secret used to sign session tokens; at least 32 characters (`openssl rand -base64 48`). |
| `JWT_EXPIRES_IN_DAYS` | no | Session lifetime, default 7. |
| `APP_URL` | recommended | Public origin, used in emails and the CSRF origin check. |
| `CORS_ORIGINS` | no | Only for split deployments where the frontend is on a different origin. |
| `ALLOWED_EMAIL_DOMAINS` | no | Restrict sign-up to domains such as `srmap.edu.in`. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | for paid events | Razorpay API keys. Without them, paid registration is disabled. |
| `RAZORPAY_WEBHOOK_SECRET` | recommended with Razorpay | Verifies webhook deliveries to `/api/payments/webhook`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | no | Registration confirmation emails. |
| `ADMIN_PASSWORD` | no | Non-interactive password for `npm run create-admin`. |

## Database setup

The app needs a PostgreSQL 14+ database reachable from the API; there is no in-memory fallback.

- **Local:** `docker compose up -d db` starts Postgres 16 on port 5434 with the credentials in `.env.example`.
- **Production:** any managed Postgres works. The live deployment uses Neon (free tier, Singapore); use its **pooled** connection string with `sslmode=require`.
- **Schema changes:** edit `shared/schema.ts`, run `npm run db:generate` to create a migration in `migrations/`, commit it, and apply it with `npm run db:migrate` (reads `DATABASE_URL`).

## API

All endpoints are under `/api`. Successful responses are `{ "data": ... }` (lists add `"meta": { page, pageSize, total, totalPages }`); errors are `{ "error": { "code", "message", "fields"? } }` with an appropriate HTTP status.

| Method and path | Access | Description |
| --- | --- | --- |
| `GET /health` | public | Liveness and database connectivity |
| `GET /config` | public | Whether payments are enabled; the public Razorpay key |
| `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` | public | Session management (rate limited) |
| `GET /auth/me`, `PATCH /auth/me`, `POST /auth/change-password` | signed in | Current user and profile |
| `GET /events` | public | Published events; `search`, `category`, `price`, `when`, `page`, `pageSize` |
| `GET /events/:id` | public | Event details (drafts visible only to their organizer and admins) |
| `POST /events`, `PATCH /events/:id`, `DELETE /events/:id` | organizer (own) / admin | Create, update, delete |
| `POST /events/:id/status` | organizer (own) / admin | Publish, unpublish or cancel |
| `PUT /events/:id/image`, `DELETE /events/:id/image` | organizer (own) / admin | Cover image (raw image body) |
| `POST /events/:id/register` | student | Register; returns a Razorpay order for paid events |
| `GET /events/:id/attendees`, `GET /events/:id/attendees.csv` | organizer (own) / admin | Attendee list and export |
| `POST /events/:id/check-in` | organizer (own) / admin | Check a ticket in by code |
| `GET /me/registrations`, `GET /me/payments` | signed in | The student's tickets and payments |
| `GET /registrations/:id`, `POST /registrations/:id/cancel` | owner (or the event's organizer to view) | Ticket details and cancellation |
| `POST /payments/verify`, `POST /payments/abandon` | owner | Confirm or release a checkout |
| `POST /payments/webhook` | Razorpay (signed) | Asynchronous payment confirmation |
| `GET /organizer/events`, `GET /organizer/stats` | organizer / admin | Organizer dashboard data |
| `GET /admin/stats`, `/admin/users`, `/admin/events`, `/admin/registrations` | admin | Platform administration |
| `PATCH /admin/users/:id`, `POST /admin/registrations/:id/cancel` | admin | Change role/status; cancel registrations |

## Authentication and authorization

1. Passwords are hashed with bcrypt (cost 12). Login responses take the same time whether or not an account exists.
2. On sign-in the server sets an `HttpOnly`, `Secure`, `SameSite=Lax` cookie containing a signed JWT (HS256, 7 days).
3. Every request re-loads the user from the database, so deactivation and role changes take effect immediately. Changing a password or role increments a token version, which revokes all existing sessions.
4. Authorization is enforced on the server for every route (`requireAuth`, `requireRole`, and ownership checks for events and tickets). The client-side route guards only improve navigation.

## Deployment

The production deployment runs on Vercel:

- **Build:** `npm run build:vercel` (configured in `vercel.json`) builds the client with Vite and packages the API into `.vercel/output`.
- **Runtime:** static assets on Vercel's CDN; `/api/*` in a Node.js 22 serverless function in `sin1` (Singapore), co-located with the Neon database.
- **Environment:** set `DATABASE_URL`, `JWT_SECRET` and `APP_URL` in the Vercel project (plus the Razorpay and SMTP variables if used), then run `npm run db:migrate` once against the production database.
- **Health check:** `GET /api/health` returns `200 {"status":"ok","database":"up"}` when healthy and `503` otherwise.

The app also runs on any Node host: `npm run build && npm start` serves the client and API from one process on `PORT`.

## Testing

```bash
npm test          # API integration tests (Vitest + Supertest on in-process Postgres)
npm run lint      # ESLint
npm run check     # TypeScript
npm run build     # production build
```

The integration suite covers authentication and sessions, role-based access control, event validation and ownership, visibility of drafts, registration, duplicate prevention, concurrent capacity handling, ticket ownership (IDOR), check-in including duplicate scans, Razorpay signature and webhook verification, seat holds and their expiry, and admin operations. Each test file runs against a fresh database built from the real migrations.

## Security

- Server-side authorization and ownership checks on every protected route; other users' tickets return 404 so IDs can't be probed.
- httpOnly session cookies, an Origin check on state-changing requests (CSRF defence in depth), and rate limiting on authentication endpoints.
- Strict Content Security Policy, HSTS, `X-Frame-Options: DENY`, `nosniff` and a camera-only Permissions-Policy.
- All input validated with Zod; SQL built with parameterised Drizzle queries; LIKE wildcards escaped in search.
- Uploaded images are verified by file signature and served with `nosniff`; CSV exports neutralise formula injection.
- Payment amounts are fixed server-side; signatures are compared in constant time; payment confirmation is idempotent.
- Error responses never include stack traces or database details, and secrets live only in environment variables.

## Author

**Aswartha Harshitha Sugreevu**
GitHub: [@AswarthaHarshitha](https://github.com/AswarthaHarshitha)
