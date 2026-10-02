# QR Attendance System — Registrar frontend

Frontend for the registrar side of the QR Attendance System, built from the
[Figma UI file](https://www.figma.com/design/grFsu7pXXcYQyyF9yHBqjp/QR-Attendance-System-%E2%80%93-UI).

React + Vite + TypeScript, styled with Tailwind v4, backed by **Supabase**
(Postgres + Auth + Storage).

## Setup

1. **Create a Supabase project** for the attendance system.

2. **Apply the migrations** in `supabase/migrations`, in order, via the
   dashboard SQL editor or the CLI:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   - `0001_registrar_schema.sql` — tables, triggers, RLS, photo bucket
   - `0002_seed_students.sql` — the eight sample learners (optional)

3. **Point the app at the project:**

   ```bash
   cp .env.example .env.local   # then fill in the two values
   ```

   Both come from the dashboard: *Project Settings → Data API* for the URL and
   *Project Settings → API Keys* for the publishable key. The app throws a clear
   error on boot if either is missing.

4. **Create the first registrar account.** There is no public sign-up — staff
   accounts are made by an administrator:

   - *Authentication → Users → Add user*, with a real email and password
     (tick "Auto Confirm User")
   - then grant it a profile, which is what RLS checks for:

     ```sql
     insert into public.registrars (id, full_name, role)
     select id, 'Rosario Gundran', 'Registrar'
       from auth.users where email = 'registrar@example.com';
     ```

   Leave email sign-ups disabled under *Authentication → Providers* so nobody
   can self-register. A user with no `registrars` row can sign in but every
   student query returns empty, by design.

5. **Run it:**

   ```bash
   npm install
   npm run dev      # http://localhost:5173
   npm run build    # type-check + production bundle
   ```

## Screens

| Route            | Figma frame           | State                        |
| ---------------- | --------------------- | ---------------------------- |
| `/login`         | 0 · Registrar Log in  | Live Supabase Auth           |
| `/students`      | 1 · Students list     | Live, server-side filtering  |
| `/register`      | 2 · Register student  | Live insert                  |
| `/students/:id`  | 3 · Student profile   | Live, with card actions      |
| `/print-queue`   | —                     | Placeholder (not in Figma)   |
| `/reissue`       | —                     | Placeholder (not in Figma)   |

Everything behind `/login` sits inside `RequireAuth`, which redirects signed-out
visitors and remembers where they were headed.

## Data model

```
registrars   id -> auth.users(id), full_name, role
students     lrn (unique, 12 digits), name parts, grade/section/strand,
             guardian contact, id_status, active, registered_by -> registrars
id_cards     student_id -> students, qr_content (unique), status, issued_on,
             revoked_at / revoked_reason
```

Two rules live in the database rather than the client:

- **`students.id_status` is derived.** A trigger on `id_cards` recomputes it:
  an active card means `printed`, cards that have all been revoked mean
  `reissue-needed`, and no cards at all means `not-printed`. The app never
  writes the column.
- **One active card per student**, enforced by a partial unique index, since the
  gate scanner must accept exactly one. Reissuing therefore revokes before it
  issues.

`strand` is constrained to Grades 11–12, matching the senior-high-only rule the
form already applied.

### Row Level Security

RLS is on for all three tables, and no policy grants the `anon` role anything —
the publishable key alone cannot read a single learner row. Every policy routes
through `public.is_registrar()`, which checks the caller has a `registrars` row.
Student photos live in a private `student-photos` bucket under the same check.

## Layout

```
src/
  main.tsx              entry + BrowserRouter + AuthProvider
  App.tsx               routes, wrapped in RequireAuth
  index.css             design tokens (@theme) + base styles
  lib/
    supabase.ts         typed client from env vars
    database.types.ts   row shapes (regenerate with supabase gen types)
    types.ts            domain types, option lists, formatting helpers
    db.ts               queries and mutations, row <-> domain mapping
    auth.tsx            AuthProvider, useAuth
  components/
    ui.tsx              Button, ButtonLink, Badge, Field, Input, Select, Card
    states.tsx          LoadingBlock, ErrorBlock, FormError
    RequireAuth.tsx     route gate for the signed-in screens
    IdCardPreview.tsx   front/back mini ID, bound to the register form
  layout/
    Sidebar.tsx         nav + signed-in registrar + sign out
    AppLayout.tsx       sidebar + 1104px content column
  pages/                one file per screen
supabase/migrations/    schema and seed SQL
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

- **Login copy** says "Email", not the Figma's "Username or email": Supabase
  password auth is email-only.
- **Edit student** is still an unwired button — no edit screen was designed.
- **Photo capture/upload** and **CSV import** are still buttons without
  behaviour. The `student-photos` bucket and `students.photo_path` column exist
  for when they are built.
- **Print queue** and **Reissue / Revoke** screens are placeholders; reissue is
  available per-student on the profile page in the meantime.
- **"Add to print queue"** on the bulk bar does not persist a queue yet.
- The QR code on the ID preview is a drawn placeholder, not a real encoding of
  `qr_content`.
- Printing is not wired to a card printer; "Print ID" issues the card record.
