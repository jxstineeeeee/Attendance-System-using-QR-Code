# QR Attendance System — Admin Console

The console that manages the other two apps: staff accounts, gate devices, the
academic calendar, the gate's own rules, and the attendance those gates
produce.

React + Vite + TypeScript, talking to the same PHP API in [`../api`](../api) as
the registrar and the scanner.

## Setup

1. The API must be running; see [`../api/README.md`](../api/README.md).

2. **An administrator account.** Only `admin` accounts may sign in here — a
   registrar or scanner password is refused with a message saying so:

   ```bash
   php api/tools/set-password.php e.marquez@lunanhs.edu.ph "a good password"
   ```

3. **Run it:**

   ```bash
   npm install
   npm run dev      # http://localhost:5175
   npm run build
   ```

   Port 5175, so it runs beside the registrar on 5173 and the scanner on 5174.

## Sessions in development

The session cookie belongs to the host and a browser ignores the port, so on
`localhost` all three apps **share one session**. Signing in to one signs the
others out. `GET /auth/session?app=admin` reports a registrar or scanner
session as signed-out, with `otherRole` naming what it is, and the sign-in
screen says so rather than looking broken for no reason.

## What each screen reads

| Screen         | Endpoint                                      |
| -------------- | --------------------------------------------- |
| Dashboard      | `GET /admin/overview`                         |
| Attendance     | `GET /admin/attendance`, `/export` for the CSV |
| Staff Accounts | `GET/POST /admin/staff`, `PATCH /admin/staff/{id}` |
| Gate Devices   | `GET/POST /admin/devices`, `/{id}/scans`      |
| Academic Setup | `GET /admin/academic`, section CRUD           |
| Audit Log      | `GET /admin/audit`, `/export` for the CSV     |
| Settings       | `GET/PATCH /admin/settings`                   |

`lib/db.ts` holds every call; `lib/useAsync.ts` is the one loading / error /
retry hook the screens share.

## Absence is the absence of a scan

This is the thing to understand before reading the Attendance or Dashboard
code. Nothing writes `absent` rows — a learner who never scanned simply has no
row for that session. So:

- The **absent count is derived**: `enrolled − present − late`, never a
  `count(*)` of absent rows.
- The **Attendance filter** for "Absent" asks the API for learners whose row is
  *missing*, not for a status value.
- A day with no scans at all shows everyone absent, which is correct, and the
  dashboard says so in as many words rather than looking like a loading bug.

## Things the console deliberately does not claim

The mock-ups promised a few things the system cannot actually do yet, so the
copy was changed rather than left to imply they work:

- **No invitation emails.** There is no mailer. "Add staff account" creates the
  account with no password, `invited`; it cannot sign in until an administrator
  sets one with the key button, and the dialog says exactly that.
- **No offline queue.** "Waiting to sync" reads `devices.pending_sync`, which
  the schema carries for when scans are buffered on a device. Nothing writes it
  yet, so it stays at zero, and the note under the device grid says so.
- **No guardian SMS.** The two SMS rules save to `school_settings` and nothing
  acts on them. Both toggles carry a "Not built" tag.
- **Closing the school year is not built.** It would rewrite four tables at once
  and cannot be undone, so it wants its own design; the card is there with the
  button disabled rather than removed, so the intent is not lost.

## Guard rails worth knowing

Enforced by the API, not just by the UI — the console only mirrors them:

- You cannot disable or change the role of **your own account**.
- You cannot disable or demote the **last active administrator**.
- An account with **no password** cannot be set `active`; giving it one does
  that by itself.
- A **section with learners in it** cannot be deleted; the error says how many.
- A **strand** cannot be put on anything but Grades 11–12 — a database trigger
  refuses it, and the dialog hides the field for junior high.
- The **eight gate times** must run in order; a CHECK constraint refuses the
  rest, and the error spells out the order.

## Layout

```
src/
  main.tsx                entry, wrapped in AuthProvider
  App.tsx                 routes, all behind RequireAuth
  index.css               design tokens, shared with the other two apps
  lib/
    api.ts                fetch wrapper: base URL, cookies, error shape
    auth.tsx              session state; signs in as app "admin"
    db.ts                 every API call the console makes
    types.ts              the shapes the API sends, and their labels
    school.ts             GET /school, for the sign-in screen
    useAsync.ts           loading / error / reload, shared by every screen
  components/
    ui.tsx                Button, Field, Input, Card, Badge, Toggle
    states.tsx            LoadingBlock, ErrorBlock, FormError
    RequireAuth.tsx       route gate
    AttendanceChart.tsx   the stacked week chart
  layout/                 sidebar and the content column
  pages/                  one per screen
```
