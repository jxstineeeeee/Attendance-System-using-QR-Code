# QR Attendance System — Registrar frontend

Frontend for the registrar side of the QR Attendance System, built from the
[Figma UI file](https://www.figma.com/design/grFsu7pXXcYQyyF9yHBqjp/QR-Attendance-System-%E2%80%93-UI).

React + Vite + TypeScript, styled with Tailwind v4, talking to the **PHP API in
[`../api`](../api)** over the local **MySQL** database `qr_attendance`
(Laragon: Apache + PHP 8.3 + MySQL 8.4).

## Setup

1. **Start Laragon** — Apache and MySQL both running.

2. **Set up the API once**, as described in [`../api/README.md`](../api/README.md):
   copy `api/config.example.php` to `api/config.php`, and link the folder into
   the Apache document root:

   ```cmd
   mklink /J "C:\laragon\www\qr-attendance-api" "<path to this repo>\api"
   ```

   Check it answers:

   ```bash
   curl http://localhost/qr-attendance-api/public/health
   ```

3. **Give yourself a password.** There is no sign-up; accounts are rows in
   `users`, and only `registrar` or `admin` accounts may sign in here:

   ```bash
   php api/tools/set-password.php r.gundran@lunanhs.edu.ph "a good password"
   ```

4. **Run it:**

   ```bash
   npm install
   npm run dev      # http://localhost:5173
   npm run build    # type-check + production bundle
   ```

   No `.env.local` is needed. Vite proxies `/api` to Apache, so the browser
   stays on one origin and the PHP session cookie works without CORS. Copy
   `.env.example` only if your API lives somewhere else.

## Screens

| Route            | Figma frame           | State                        |
| ---------------- | --------------------- | ---------------------------- |
| `/login`         | 0 · Registrar Log in  | Live, session cookie         |
| `/students`      | 1 · Students list     | Live, server-side filtering  |
| `/register`      | 2 · Register student  | Live insert                  |
| `/students/:id`  | 3 · Student profile   | Live, with card actions      |
| `/reissue`       | —                     | Live: issue, reissue, revoke |

Everything behind `/login` sits inside `RequireAuth`, which redirects signed-out
visitors and remembers where they were headed. That gate is a convenience only
— the API rejects every request that arrives without a valid session.

## Talking to the database

The browser never speaks SQL. Each function in `lib/db.ts` is one request to
the PHP API, which answers with the same camelCase shapes the screens use, so
there is no row-mapping layer on this side.

```
pages/*  →  lib/db.ts  →  lib/api.ts  →  /api/*  →  api/src/*.php  →  MySQL
```

Two consequences worth knowing:

- **The client never says who is acting.** `registered_by`, `issued_by` and the
  audit trail come from the session on the server, so `registerStudent(form)`
  and `issueCard(id)` take no registrar id.
- **The printer list comes from the server.** A browser cannot enumerate
  printers, so `lib/printer.tsx` reads them from `GET /printers` — the printers
  on the machine running Apache, which here is the registrar's own PC. The
  selection lives in `localStorage`, because it belongs to the desk rather than
  to the account.
- **Grade levels and sections are data, not constants.** `lib/roster.ts` loads
  them from `GET /options` and the dropdowns are built from that, because a
  learner can only be enrolled into a section that exists in the active school
  year. Picking the section is also what sets the strand — Grade 11 Kamagong
  *is* STEM — so the strand field is shown, not chosen.

## Data model

Defined in MySQL (see `../api/README.md`); the tables this app touches:

```
users        id, full_name, email, password_hash, role, status
students     lrn (unique, 12 digits), name parts, sex, guardian contact,
             id_status, active, registered_by -> users
enrollments  student_id -> students, school_year_id, section_id -> sections
sections     per school year: name, grade_level_id, strand_id, adviser
id_cards     student_id -> students, qr_content (unique), status, issued_on,
             revoked_at / revoked_reason
v_students   the view the list and profile read: a learner with their grade,
             section, strand and registrar already resolved
```

`students.id_status` is recomputed by triggers on `id_cards`, and a unique
index keeps exactly one active card per learner, so the gate scanner can trust
what it reads.

## Layout

```
src/
  main.tsx              entry + BrowserRouter + AuthProvider
  App.tsx               routes, wrapped in RequireAuth
  index.css             design tokens (@theme) + base styles
  lib/
    api.ts              fetch wrapper: base URL, cookies, error shape
    db.ts               one function per API endpoint
    roster.ts           grade levels and sections, loaded once and shared
    printer.tsx         PrinterProvider: the printer list and the chosen one
    types.ts            domain types, option lists, formatting helpers
    auth.tsx            AuthProvider, useAuth
  components/
    ui.tsx              Button, ButtonLink, Badge, Field, Input, Select, Card
    states.tsx          LoadingBlock, ErrorBlock, FormError
    RequireAuth.tsx     route gate for the signed-in screens
    IdCardPreview.tsx   front/back mini ID, bound to the register form
    IdQrCode.tsx        the scannable QR for an issued card
    PrinterSelect.tsx   picks which printer ID cards are recorded against
  layout/
    Sidebar.tsx         nav + signed-in user + sign out
    AppLayout.tsx       sidebar + 1104px content column
  pages/                one file per screen
supabase/migrations/    superseded — the Postgres schema from before the move
                        to MySQL, kept only for reference
```

## Design tokens

Sampled from the Figma frames and declared in `src/index.css` under `@theme`,
so they are available as Tailwind utilities (`bg-brand`, `text-muted`, …).

| Token             | Value     | Use                          |
| ----------------- | --------- | ---------------------------- |
| `brand`           | `#1d5a3a` | Sidebar, primary buttons     |
| `brand-active`    | `#2d7350` | Active nav item              |
| `brand-soft`      | `#e3eee7` | Success badges, bulk bar     |
| `cream`           | `#f6f5f0` | Page background              |
| `gold`            | `#c9a227` | Accent bar, avatar, ID edges |
| `ink` / `muted`   | `#1a1a17` / `#5a5a55` | Body text        |
| `line`            | `#dcdad1` | Card borders                 |
| `warn-bg/fg`      | `#fbefd0` / `#7a5a00` | "Not printed"    |
| `danger-bg/fg`    | `#f6dede` / `#8a2323` | "Reissue needed", revoked |

Type is Barlow (body) and Barlow Condensed (display), loaded from Google Fonts
in `index.html`.

## Known gaps

- **Edit student** is still an unwired button — no edit screen was designed,
  and the API has no update endpoint yet.
- **Photo capture/upload** and **CSV import** are still buttons without
  behaviour. `students.photo_path` exists for when they are built.
- **Reissue / Revoke** lists learners waiting for a replacement and learners
  holding a card, with a recorded reason on every action. It shows no QR codes
  of its own — the learner's profile is one click away for that.
- **"Add to print queue"** on the students bulk bar does not persist a queue
  yet, and the Print Queue screen it implied has been dropped from the nav.
- The QR on the **register form's** ID preview is still a drawn placeholder:
  the card code does not exist until the card is issued. The student profile
  shows the real, scannable code (`components/IdQrCode.tsx`, rendered with
  `qrcode.react`), encoding the active card's `qr_content` — the LRN plus that
  card's own code, so it is unique per learner and changes on a reissue.
- **Printing is not wired to a card printer.** A printer can be *chosen* — the
  selector lists the printers installed on the machine running the API, and the
  choice is remembered in the browser and stored on each card as
  `printer_name` / `printed_at` — but "Print ID" still only issues the card
  record. Nothing is spooled and no card artwork is rendered yet.
- A learner with no enrolment in the active school year shows a dash for grade
  and section; there is no screen yet for re-enrolling them.
