# QR Attendance System

```
api/         PHP API over the MySQL database — the backend for all three apps
db/          The qr_attendance schema, and the migrations that change it
registrar/   Registrar web app — student registration, profiles, ID cards (React + Vite)
scanner/     Gate scanner — reads learner QR codes, records time in / time out (React + Vite)
admin/       Admin console — attendance, staff, devices, settings (React + Vite)
```

Each frontend is a self-contained Vite project with its own `package.json`,
`node_modules` and `src/`. They share one backend: plain PHP 8 and PDO against
the MySQL database `qr_attendance`, served by the Apache in Laragon.

## Running it

1. **Laragon** running, with Apache and MySQL started.
2. **The API**, once per machine — see [`api/README.md`](api/README.md):

   ```bash
   cp api/config.example.php api/config.php
   ```

   ```cmd
   mklink /J "C:\laragon\www\qr-attendance-api" "<path to this repo>\api"
   ```

3. **A frontend:**

   ```bash
   cd registrar   # or: cd scanner, cd admin
   npm install
   npm run dev
   ```

   The registrar serves on 5173, the scanner on 5174 and the admin console on
   5175, so all three can run at once. Note that they share one session cookie
   on `localhost`, because browsers ignore the port — signing in to one signs
   the others out.

All three apps are wired to the API; none of them run on mock data any more.

## The database

[`db/schema.sql`](db/schema.sql) is a snapshot of the live structure, kept in
the repo so the schema is readable without a running MySQL. It is not the
migration path — [`db/migrations/`](db/migrations) holds the ordered changes,
and the snapshot is regenerated after each one:

```bash
mysqldump -u root --no-data --routines --triggers --skip-dump-date --no-tablespaces qr_attendance > db/schema.sql
```

To build the database from nothing, run the snapshot, then any migration newer
than it.
