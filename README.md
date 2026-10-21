# QR Attendance System

```
api/         PHP API over the MySQL database — the backend for all three apps
db/          SQL migrations for the qr_attendance schema
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
   cd registrar   # or: cd scanner
   npm install
   npm run dev
   ```

   The registrar serves on 5173 and the scanner on 5174, so both can run at
   once. Note that they share one session cookie on `localhost`, because
   browsers ignore the port — signing in to one signs the other out.

The registrar and the scanner are wired to the API. The admin console still
runs on mock data.
