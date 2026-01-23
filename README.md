# Vessel Issue Reporting System

Full-stack web app for fleet admins and crew to manage vessels and report issues. Built with **Next.js**, **TypeScript**, **Prisma**, and **SQLite**.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes (Node.js)
- **Database:** SQLite via Prisma ORM
- **Auth:** JWT in httpOnly cookies, bcrypt for passwords

## Setup

### Prerequisites

- Node.js 18+
- npm

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

Copy the example env and set a JWT secret:

```bash
cp .env.example .env
```

Edit `.env`:

- `DATABASE_URL="file:./dev.db"` — SQLite path (default is fine)
- `JWT_SECRET` — any long random string for production
- **Password reset email (optional):**  
  - `RESEND_API_KEY` + `FROM_EMAIL` — to send reset links via [Resend](https://resend.com).  
  - If unset, the reset link is logged to the server console (fine for local dev).  
- `NEXT_PUBLIC_APP_URL` — e.g. `http://localhost:3000` (used in reset emails)

### 3. Database

```bash
npx prisma db push
npx prisma db seed
```

Or in one go:

```bash
npx prisma db push && npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Credentials (from seed)

| Role        | Email             | Password  |
|-------------|-------------------|-----------|
| Fleet Admin | `admin@fleet.com` | `admin123` |
| Crew Member | `crew@vessel.com` | `crew123`  |

---

## User Roles

### Fleet Admin

- CRUD vessels (Admin → Vessels table: Add, Edit, Delete)
- **Assign crew to vessels** (Edit vessel → Assigned crew). Crew can only see and report for assigned vessels.
- Crew register at `/register`; admin uses the Crew section and Edit vessel to assign.
- View and update issues (status, recommendation) on the issue detail page
- **Maintenance Scan** (Admin page): lists vessels with last inspection &gt; 90 days ago or null

### Crew Member

- **Register** at `/register` (crew only). Admin must **assign each vessel** to crew; until then, crew sees no vessels.
- See only **assigned** vessels; report issues **only for vessels they have access to**.
- **My Issues**: only issues **they reported**; view status and admin **recommendations**.
- **Forgot / Reset password**: link on login; reset token is sent by email (or logged to console if email not configured).

---

## Main Pages

| Route        | Who   | Purpose                                  |
|-------------|-------|------------------------------------------|
| `/login`    | All   | Sign in; links to Register, Forgot password |
| `/register` | All   | Register as crew only                    |
| `/forgot-password` | All | Request reset link (email or console)   |
| `/reset-password?token=` | All | Set new password from email link    |
| `/vessels`  | All   | Crew: assigned only; admin: all          |
| `/vessels/[id]` | All | Vessel detail + issues, Report issue   |
| `/report`   | Crew  | Form (only vessels assigned to you)      |
| `/issues`   | All   | Crew: only their issues; Admin: all      |
| `/issues/[id]` | All | Issue detail; Admin: set status/rec  |
| `/admin`    | Admin | Crew list, vessel CRUD, assign crew, Maintenance Scan |

---

## API (overview)

- `POST /api/auth/login` — body: `{ email, password }` → JWT in cookie + `{ token, user }`
- `POST /api/auth/register` — body: `{ email, password, confirmPassword }` → crew only
- `POST /api/auth/forgot-password` — body: `{ email }` → sends reset link (email or console)
- `POST /api/auth/reset-password` — body: `{ token, newPassword, confirmPassword }`
- `POST /api/auth/logout` — clear cookie
- `GET /api/me` — current user (id, email, role, assignedVesselIds)
- `GET /api/vessels` — list (crew: assigned; admin: all), includes `openIssueCount`
- `GET /api/vessels/[id]` — one vessel + `openIssueCount`, `assignedCrewIds` (admin)
- `POST /api/vessels` — Admin: create (name, imo, flag, type, status, lastInspectionDate?)
- `PATCH /api/vessels/[id]` — Admin: update fields + `assignedCrewIds`
- `DELETE /api/vessels/[id]` — Admin: delete vessel
- `GET /api/issues` — Crew: mine; Admin: all. `?vesselId=x` for one vessel (if allowed)
- `POST /api/issues` — Crew: create (vesselId, category, description, priority)
- `GET /api/issues/[id]` — one issue (crew: own or assigned vessel; admin: any)
- `PATCH /api/issues/[id]` — Admin: `status`, `recommendation`
- `GET /api/users` — Admin: list crew (for assignment)
- `POST /api/maintenance-scan` — Admin: returns `vesselsDueForInspection`

All protected API routes use the `token` cookie; 401/403 and validation errors are returned as JSON.

---

## Example `curl` commands

**Login (get `token` and cookie):**

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fleet.com","password":"admin123"}'
```

**Me (reuse cookie):**

```bash
curl -b cookies.txt http://localhost:3000/api/me
```

**Vessels:**

```bash
curl -b cookies.txt http://localhost:3000/api/vessels
```

**Maintenance scan (admin):**

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/maintenance-scan
```

**Create issue (crew; switch to crew cookie or use crew login):**

```bash
# After logging in as crew@vessel.com and saving cookie to cookies.txt
curl -b cookies.txt -X POST http://localhost:3000/api/issues \
  -H "Content-Type: application/json" \
  -d '{"vesselId":"<VESSEL_ID>","category":"Safety","description":"Test","priority":"Low"}'
```

---

## Time log (example)

| Task                      | Time (approx) |
|---------------------------|---------------|
| Project init, Prisma, deps| 15 min        |
| Auth (JWT, login, guards) | 25 min        |
| API: vessels, issues, scan| 40 min        |
| Frontend: login, vessels, report, issues, admin | 50 min |
| Seed, README, curl, polish| 20 min        |
| **Total**                 | **~2.5 h**    |

---

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm start` — production
- `npm run db:push` — push Prisma schema to DB
- `npm run db:seed` — seed 1 admin, 1 crew, 3 vessels, 6 issues
- `npm run lint` — ESLint

---

## Models (Prisma)

- **User:** id, email, passwordHash, role (FLEET_ADMIN | CREW_MEMBER)
- **UserVessel:** userId, vesselId (join; admin assigns crew to vessels)
- **PasswordResetToken:** id, userId, token, expiresAt (for reset-password links)
- **Vessel:** id, name, imo, flag, type, status, lastInspectionDate
- **Issue:** id, vesselId, category, description, priority (Low/Med/High), status (Open/Resolved), recommendation?, reportedById?, createdAt
