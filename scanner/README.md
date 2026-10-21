# QR Attendance System — Gate scanner

The app that runs on the tablet at the gate. A learner holds up their ID, the
camera reads the QR, and the API decides what it means: time in, time out, or
refused.

React + Vite + TypeScript, talking to the same PHP API in [`../api`](../api) as
the registrar. No router — a gate app has one screen and two pieces of setup.

## Setup

1. The API must be running; see [`../api/README.md`](../api/README.md).

2. **A scanner account.** Sign-in is required because every scan is stamped
   with the operator holding the device. Only `scanner` and `admin` accounts
   may sign in here:

   ```bash
   php api/tools/set-password.php d.ramos@lunanhs.edu.ph "a good password"
   ```

3. **Run it:**

   ```bash
   npm install
   npm run dev      # http://localhost:5174
   npm run build
   ```

   Port 5174, so it can run beside the registrar on 5173.

## The school day

A learner scans four times: in and out for the morning, in and out for the
afternoon. The clock decides which of the four it is — nobody presses a mode
button — and the boundaries come from `school_settings`, so a school on a
different timetable changes them there rather than in this code.

| Window        | From              | Until              | Late after          |
| ------------- | ----------------- | ------------------ | ------------------- |
| Morning in    | `gate_opens_at`   | `am_out_opens_at`  | `am_late_cutoff_at` |
| Morning out   | `am_out_opens_at` | `am_out_closes_at` | —                   |
| Afternoon in  | `pm_in_opens_at`  | `pm_out_opens_at`  | `pm_late_cutoff_at` |
| Afternoon out | `pm_out_opens_at` | `gate_closes_at`   | —                   |

The gap between `am_out_closes_at` and `pm_in_opens_at` is lunch, when the gate
is shut. Defaults: 06:00 · 07:20 · 11:30 · 12:30 · 12:30 · 13:30 · 16:00 ·
18:00.

Each half of the day is its own row in `attendance_daily`, keyed by
`(student_id, attendance_date, session)`. That keeps `time_in`, `time_out`,
`status` and `missing_time_out` meaning exactly what they always did — just
per session rather than per day — and `v_attendance_sheet` pivots the two rows
back into one printable line.

## How a scan is decided

| What the API sees                                 | What it answers                  |
| ------------------------------------------------- | -------------------------------- |
| Code matches no card                               | Refused · Unknown code           |
| Card revoked (and `reject_revoked_cards` is on)    | Refused · Revoked ID             |
| Learner deactivated                                | Refused · Not an active learner  |
| Before the gate opens, or after it closes          | Refused · Outside gate hours     |
| Between morning out and afternoon in               | Refused · Gate closed for lunch  |
| In an *in* window, no row for that session yet     | **Time in** — late past the cutoff |
| In an *in* window, already timed in                | Refused · Already timed in this morning / afternoon |
| In an *out* window, never timed in that session    | Refused · No morning / afternoon time in |
| In an *out* window, timed in earlier               | **Time out**                     |
| In an *out* window, already timed out              | Refused · Already timed out this morning / afternoon |
| Timing out in the same second as timing in         | Refused · Just timed in          |

That last one exists because `attendance_daily` requires `time_out > time_in`.
Refusing it here keeps a double scan from turning a constraint into a server
error.

Every scan writes a `scan_events` row, including the refused ones — that log is
what the admin console's audit view reads. Only an accepted scan touches
`attendance_daily`.

## Reading the code

- **The camera** is decoded here, not by the browser: `BarcodeDetector` is not
  available on Windows Chrome, which is what the dev machines and the gate
  tablets run. `lib/useQrScanner.ts` draws each video frame into an offscreen
  canvas at 480px wide and hands the pixels to `jsqr`.
- **Without a camera** — a machine that has none, or a card that will not read
  — the same decoder takes a still image, and there is a field for keying the
  card code in by hand. Both go through the identical submit path.
- **A code sits in front of the lens for many frames.** The same text is
  ignored for five seconds after it is accepted, so one card is one scan.
- **Every scan carries a `clientEventId`.** The API has a unique index on
  (device, clientEventId), so a resend after a dropped reply replays the first
  decision instead of recording the scan twice. The screen marks it
  "Already recorded".
- **The verdict is never cleared outright.** It dims after ~3 seconds and is
  labelled "previous scan", so a guard who looked away can still see what the
  last learner got, without mistaking it for the one in front of them.
- **Sound.** A rising pair for accepted, a flatter pair for late, a low buzz
  for refused — the person at the gate should not have to watch the screen.

## Sessions in development

The session cookie belongs to the host, and browsers ignore the port, so on
`localhost` the registrar (5173) and the scanner (5174) **share one session**.
Signing in to one signs the other out in the same browser. The API reports a
registrar session as signed-out to the scanner, and the sign-in screen says
so, rather than letting the app start and fail on its first request. On real
hardware this does not arise: the gate tablet is its own device.

## Layout

```
src/
  main.tsx                entry
  App.tsx                 operator -> device -> scanning
  index.css               design tokens, shared with the registrar
  lib/
    api.ts                fetch wrapper: base URL, cookies, error shape
    gate.ts               API calls and the result types
    useQrScanner.ts       camera frames and still images -> text
    beep.ts               the three outcome tones
  components/
    ui.tsx                Button, Field, Input, Card
    ScanResult.tsx        the full-bleed verdict panel
  screens/
    SignIn.tsx            operator sign-in
    PickDevice.tsx        which gate this tablet is
    Gate.tsx              the scanning screen
```

## Known gaps

- **No offline queue.** A scan needs the API to be reachable. `devices.pending_sync`
  exists in the schema for when scans are buffered on the device instead.
- **No guardian SMS.** `guardian_notifications` and the `sms_on_time_in` /
  `sms_on_absent` settings exist, but nothing queues a message yet.
- **No absent marking.** Learners who never scan have no row for that session;
  a nightly job should write their `absent` rows.
- **Nothing enforces a full day.** A learner who scans the morning and skips
  the afternoon simply has no afternoon row. Whether that counts as half a day
  is a reporting decision nobody has made yet.
- **The photo is not shown.** `students.photo_path` comes back with the scan,
  so the guard could check the face against the card — the bucket those files
  live in is not wired up yet.
- **The operator is trusted, the device is not authenticated.** Anyone signed
  in can claim to be any gate. A per-device key belongs in `devices` before
  this runs outside the school network.
