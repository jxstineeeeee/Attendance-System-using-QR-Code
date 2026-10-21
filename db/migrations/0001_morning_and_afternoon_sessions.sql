-- Morning and afternoon sessions
--
-- A learner now scans four times a day: in and out for the morning, in and
-- out for the afternoon. Rather than widening attendance_daily to four
-- timestamp columns, each session gets its own row, discriminated by the new
-- `session` column. Every existing column keeps its meaning — time_in,
-- time_out, status, missing_time_out and the two device columns are now
-- per session — so the CHECK constraints and the generated column carry over
-- untouched.
--
-- school_settings gains the afternoon half of the timetable. The morning
-- columns are renamed to match (late_cutoff_at -> am_late_cutoff_at,
-- time_out_opens_at -> am_out_opens_at) now that there is a pm_ counterpart.
--
-- Safe to run once, on MySQL 8. Apply with:
--   mysql -u root qr_attendance < db/migrations/0001_morning_and_afternoon_sessions.sql

-- ---------------------------------------------------------------- attendance

ALTER TABLE attendance_daily
  ADD COLUMN session enum('am','pm') NOT NULL DEFAULT 'am' AFTER attendance_date,
  DROP INDEX uq_attendance_student_date,
  ADD UNIQUE KEY uq_attendance_student_date_session
    (student_id, attendance_date, session);

-- ------------------------------------------------------------------ settings

-- The old constraint only knew about the morning half of the day, and it has
-- to go first: MySQL refuses to rename a column a CHECK still refers to.
ALTER TABLE school_settings DROP CHECK chk_settings_gate_order;

ALTER TABLE school_settings
  CHANGE COLUMN late_cutoff_at am_late_cutoff_at time NOT NULL DEFAULT '07:20:00',
  CHANGE COLUMN time_out_opens_at am_out_opens_at time NOT NULL DEFAULT '11:30:00',
  ADD COLUMN am_out_closes_at time NOT NULL DEFAULT '12:30:00' AFTER am_out_opens_at,
  ADD COLUMN pm_in_opens_at   time NOT NULL DEFAULT '12:30:00' AFTER am_out_closes_at,
  ADD COLUMN pm_late_cutoff_at time NOT NULL DEFAULT '13:30:00' AFTER pm_in_opens_at,
  ADD COLUMN pm_out_opens_at  time NOT NULL DEFAULT '16:00:00' AFTER pm_late_cutoff_at;

ALTER TABLE school_settings ADD CONSTRAINT chk_settings_gate_order CHECK (
      gate_opens_at     < am_late_cutoff_at
  AND am_late_cutoff_at < am_out_opens_at
  AND am_out_opens_at   < am_out_closes_at
  AND am_out_closes_at <= pm_in_opens_at
  AND pm_in_opens_at    < pm_late_cutoff_at
  AND pm_late_cutoff_at < pm_out_opens_at
  AND pm_out_opens_at   < gate_closes_at
);

-- --------------------------------------------------------------------- view
--
-- One row per learner per day again, with the four scans pivoted back out —
-- which is the shape an attendance sheet is actually printed in.

DROP VIEW IF EXISTS v_attendance_sheet;

CREATE VIEW v_attendance_sheet AS
SELECT
  a.student_id,
  a.attendance_date,
  s.lrn,
  CONCAT(
    s.last_name, ', ', s.first_name,
    IF(s.middle_name IS NULL OR s.middle_name = '', '',
       CONCAT(' ', LEFT(s.middle_name, 1), '.')),
    IF(s.suffix IS NULL OR s.suffix = '', '', CONCAT(' ', s.suffix))
  ) AS name,
  g.name AS grade_level,
  sec.name AS section,
  MAX(CASE WHEN a.session = 'am' THEN a.time_in  END) AS am_in,
  MAX(CASE WHEN a.session = 'am' THEN a.time_out END) AS am_out,
  MAX(CASE WHEN a.session = 'pm' THEN a.time_in  END) AS pm_in,
  MAX(CASE WHEN a.session = 'pm' THEN a.time_out END) AS pm_out,
  MAX(CASE WHEN a.session = 'am' THEN a.status   END) AS am_status,
  MAX(CASE WHEN a.session = 'pm' THEN a.status   END) AS pm_status,
  -- Any session entered but never left.
  MAX(a.missing_time_out) AS missing_time_out,
  MAX(d.name) AS gate
FROM attendance_daily a
JOIN students s ON s.id = a.student_id
LEFT JOIN enrollments e
       ON e.student_id = a.student_id AND e.school_year_id = a.school_year_id
LEFT JOIN sections sec ON sec.id = e.section_id
LEFT JOIN grade_levels g ON g.id = sec.grade_level_id
LEFT JOIN devices d ON d.id = a.time_in_device_id
GROUP BY a.student_id, a.attendance_date, s.lrn, name, g.name, sec.name;
