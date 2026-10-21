# QR Attendance System — PHP API

The backend the frontends talk to: plain PHP 8 and PDO over the MySQL database
`qr_attendance`, running under the Apache that ships with Laragon. No framework
and no Composer — the whole thing is the files in `src/` behind one front
controller.

All three frontends use it: the registrar, the gate scanner and the admin
console.

## Setup

1. **Credentials.** Copy the template and edit it if your MySQL is not stock
   Laragon (root, no password):

   ```bash
   cp api/config.example.php api/config.php
   ```

   `config.php` is gitignored.

2. **Publish it in Apache.** The project lives outside `C:\laragon\www`, so
   link it in. From an ordinary (non-admin) terminal:

   ```cmd
   mklink /J "C:\laragon\www\qr-attendance-api" "<path to this repo>\api"
   ```

   The API is then at <http://localhost/qr-attendance-api/public>. A junction
   needs no Apache restart. The alternative, if you prefer a tidier URL, is an
   alias in `C:\laragon\etc\apache2\alias\` pointing at `api/public` — that one
   does need Apache reloaded, and the dev proxy target in
   `registrar/vite.config.ts` changed to match.

   Only `api/public` is reachable either way: `api/.htaccess` denies the rest,
   so `config.php`, `src/` and `tools/` are not served.

3. **Check it:**

   ```bash
   curl http://localhost/qr-attendance-api/public/health
   # {"ok":true,"mysql":"8.4.3"}
   ```

## Accounts

Staff accounts are rows in `users`; there is no sign-up. `password_hash` holds
a bcrypt hash, and the only supported way to write one is:

```bash
php api/tools/set-password.php r.gundran@lunanhs.edu.ph "a good password"
```

Run with an unknown email, it lists the accounts on file. An account whose
`status` is `invited` becomes `active` once it has a password.

Which roles may use which frontend is `config.php` → `apps`: registrar and
admin for the registrar, scanner and admin for the gate, and admin only for the
console. A login request names the app it is for, and every endpoint checks the
role again, so a scanner account cannot reach learner records by pointing at
the registrar's URL.

One session cookie serves all three, and browsers ignore the port — so on
`localhost` the registrar (5173), the scanner (5174) and the admin console
(5175) share it. Signing in to one signs the others out.
`GET /auth/session?app=<name>` reports a session belonging to another app as
signed-out, with `otherRole` naming what it is.

Two rules keep an administrator from locking everyone out, and both live in
`staff.php` rather than in the console: you cannot disable or demote your own
account, and you cannot remove the last active administrator.

## Endpoints

Sessions are a PHP cookie (`qr_attendance_sid`, path `/`). Everything except
`/health` and `/auth/*` returns `401 {"error":"Please sign in."}` without one.

| Method  | Path                      | Does                                              |
| ------- | ------------------------- | ------------------------------------------------- |
| `GET`   | `/`                       | Name, database, whether this cookie is signed in   |
| `GET`   | `/health`                 | Reaches MySQL and reports its version              |
| `POST`  | `/auth/login`             | `{email, password}` → the user; sets the cookie    |
| `POST`  | `/auth/logout`            | Ends the session                                   |
| `GET`   | `/auth/session`           | `{user}` or `{user: null}`                         |
| `GET`   | `/options`                | Grade levels, sections and strands on the roster   |
| `GET`   | `/printers`               | Printers installed on the machine running this API |
| `GET`   | `/devices`                | The gates a scanner can identify itself as (scanner) |
| `GET`   | `/gate`                   | The gate hours and the server clock (scanner)      |
| `POST`  | `/scan`                   | One QR presented at a gate (scanner)               |
| `GET`   | `/students`               | `?query&grade&section&status&page&pageSize`        |
| `POST`  | `/students`               | Registers a learner, enrols them, issues their ID  |
| `GET`   | `/students/lrn-taken`     | `?lrn=` → `{taken}`                                |
| `GET`   | `/students/{id}`          | One learner with their card history                |
| `PATCH` | `/students/{id}`          | `{active: bool}`                                   |
| `POST`  | `/students/{id}/cards`    | Issues a card                                      |
| `POST`  | `/students/{id}/reissue`  | `{reason}` — revokes the active card, issues a new |
| `POST`  | `/students/{id}/revoke`   | `{reason}` — revokes the active card, no new one   |
| `PATCH` | `/cards/{id}`             | `{reason}` — revokes one card by its own id        |
| `GET`   | `/school`                 | School name and address; **no session needed**     |

The admin console's own endpoints, all `admin`-only:

| Method   | Path                              | Does                                           |
| -------- | --------------------------------- | ---------------------------------------------- |
| `GET`    | `/admin/overview`                 | Dashboard: today, the week, gates, recent scans |
| `GET`    | `/admin/attendance`               | `?date&session&query&grade&section&status&page` |
| `GET`    | `/admin/attendance/export`        | The same sheet as a CSV download                |
| `GET`    | `/admin/staff`                    | `?query&role&status`                            |
| `POST`   | `/admin/staff`                    | `{name, email, role}` — creates it `invited`    |
| `PATCH`  | `/admin/staff/{id}`               | `{name?, role?, status?}`                       |
| `POST`   | `/admin/staff/{id}/password`      | `{password}` — an invited account goes active   |
| `GET`    | `/admin/devices`                  | Every gate, retired ones included               |
| `POST`   | `/admin/devices`                  | `{code, name, location?}` — pairs one           |
| `PATCH`  | `/admin/devices/{id}`             | `{name?, location?, isActive?}`                 |
| `GET`    | `/admin/devices/{id}/scans`       | That gate's scans today                         |
| `GET`    | `/admin/academic`                 | Years, grades, strands, sections with rosters   |
| `POST`   | `/admin/academic/sections`        | `{name, gradeLevelId, strandId?, adviser?}`     |
| `PATCH`  | `/admin/academic/sections/{id}`   | The same shape                                  |
| `DELETE` | `/admin/academic/sections/{id}`   | Refused while anybody is enrolled in it         |
| `GET`    | `/admin/audit`                    | `?query&kind&from&page&pageSize`                |
| `GET`    | `/admin/audit/export`             | The same log as a CSV download                  |
| `GET`    | `/admin/settings`                 | The one `school_settings` row                   |
| `PATCH`  | `/admin/settings`                 | Any subset of it                                |

Errors are always `{"error": "a sentence for the user"}` with a real status
code, which is what the frontend shows verbatim.

The three card routes (`cards`, `reissue`, and `POST /students`) accept an
optional `printer`. When one is given it is stored on the card as
`printer_name`, with `printed_at` — a record of where the card was meant to
come out. Nothing is spooled to the printer; see *Printers* below.

## Printers

`GET /printers` shells out to PowerShell (`Get-CimInstance Win32_Printer`) and
returns name, default, offline and port for each, plus a `virtual` flag for the
ones that write a file instead of printing — Print to PDF, OneNote. The result
is cached for 60 seconds per session, since the WMI query is the slow part.

**The list belongs to the machine running Apache, not to the browser.** A web
page cannot enumerate printers — no API exists for it — so this is the only way
to offer a choice. In this deployment the registrar's PC *is* the server, so
the two are the same list; put the API on a different machine and this endpoint
will describe that machine's printers instead. The endpoint answers with an
empty list and a `note` explaining why on a non-Windows host, or where PHP
cannot run shell commands.

## How it is put together

```
public/index.php   front controller: CORS, session, routing
public/.htaccess   rewrites every path to index.php
src/bootstrap.php  config, PDO, JSON helpers, session cookie, error handlers
src/auth.php       sign in / out, current_user(), require_user(), audit trail
src/students.php   list, read, create (student + enrolment), activate
src/cards.php      issue, revoke, reissue
src/options.php    the roster behind the form dropdowns
src/printers.php   printers on the machine running this API
src/scan.php       the gate: judge a scan, log it, write attendance
src/devices.php    the gates: the scanner's pick-list, and pairing them
src/attendance.php the dashboard and the attendance sheet, plus its CSV
src/staff.php      staff accounts, roles, and setting a password
src/academic.php   school years, grades, strands, sections
src/settings.php   school_settings, GET /school, and the audit log
tools/             command-line helpers, never served
```

Three things are deliberately the database's job, not this code's:

- **`students.id_status` is derived.** Triggers on `id_cards` call
  `recompute_id_status`, so an active card means `printed`, all-revoked means
  `reissue-needed`, and no cards means `not-printed`. No statement here writes
  that column.
- **One active card per student**, enforced by the unique index on
  `(student_id, active_flag)`. Reissuing revokes inside a transaction before it
  issues, and a duplicate-key error is reported as "already has an active
  card". The issue, revoke and reissue routes are keyed by *student* on
  purpose: the server resolves which card is active, so a caller working from a
  roster never carries a card id around.
- **Strand follows the section.** A learner is enrolled into a section row, and
  that row carries the grade level and strand, so the API resolves the names
  the form sent and ignores whatever strand the browser thought applied.

Who performed an action is never taken from the request body — `registered_by`,
`issued_by`, `scan_events.operator_id` and `audit_log.actor_id` all come from
the session.

## The gate

`POST /scan` takes `{qrContent, device, clientEventId}` and answers with the
verdict, the learner, and both halves of their day. The rules come from
`school_settings` on every scan, so changing the timetable in the admin console
takes effect immediately; `scanner/README.md` has the full decision table.

The day has four windows — morning in, morning out, afternoon in, afternoon
out — and the clock alone decides which one a scan belongs to. Each half of the
day is its own `attendance_daily` row, keyed by
`(student_id, attendance_date, session)`.

Two details worth knowing:

- **Every clock reading comes from MySQL** (`now()`, `curdate()`, `curtime()`).
  PHP runs in UTC on this host while MySQL runs in local time, so asking PHP
  for the time would put a learner on the wrong side of the late cutoff.
- **`clientEventId` makes a resend safe.** A unique index on
  (device_id, client_event_id) means a scan sent twice after a dropped reply
  replays the first decision instead of recording two.

Refused scans are logged to `scan_events` like any other; only accepted ones
touch `attendance_daily`.

## Absence is the absence of a row

Nothing writes `absent` rows. A learner who never scans simply has no row for
that session, so every read in `attendance.php` starts from the enrolment
roster and left-joins the day — it never starts from `attendance_daily`.
`v_attendance_sheet` does start there, which is right for printing a sheet of
who turned up and wrong for answering "who was not here"; that is why the
console does not use it.

It also means `absent` is not a value the status filter can match on. The
filter asks for rows that are missing instead, and the dashboard's absent
count is `enrolled − present − late`.
