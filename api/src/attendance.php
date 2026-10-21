<?php

declare(strict_types=1);

/**
 * What the gate produced, read back: the admin console's dashboard and its
 * attendance sheet.
 *
 * The one thing to understand here is that **a learner with no scan has no
 * row**. Nothing writes `absent` rows yet (see the gaps in scanner/README.md),
 * so absence is not a value to filter on — it is the absence of a row. Every
 * query below therefore starts from the enrolment roster and left-joins the
 * day, rather than starting from `attendance_daily` as `v_attendance_sheet`
 * does. That view is for printing a sheet of learners who turned up; this is
 * for answering "who was not here".
 */

const ATTENDANCE_PAGE_MAX = 200;

/** Monday of the week a date falls in, and the Friday four days later. */
function school_week(string $date): array
{
    $stmt = db()->prepare(
        'select date_sub(?, interval weekday(?) day) as monday,
                date_add(date_sub(?, interval weekday(?) day), interval 4 day) as friday'
    );
    $stmt->execute([$date, $date, $date, $date]);

    return $stmt->fetch();
}

/** Active learners on the roster for a school year. */
function enrolled_count(int $yearId): int
{
    $stmt = db()->prepare(
        'select count(*) from enrollments e
           join students s on s.id = e.student_id
          where e.school_year_id = ? and s.active = 1'
    );
    $stmt->execute([$yearId]);

    return (int) $stmt->fetchColumn();
}

/**
 * Present / late / absent for each day in a range, for one session.
 *
 * Only present and late are counted from rows; absent is whatever is left of
 * the roster, which is why `$enrolled` has to be passed in. A day nobody
 * scanned still gets an entry, with everyone absent.
 */
function day_totals(string $from, string $to, string $session, int $enrolled): array
{
    $stmt = db()->prepare(
        "select attendance_date, status, count(*) as tally
           from attendance_daily
          where session = ? and attendance_date between ? and ?
            and status in ('present', 'late')
          group by attendance_date, status"
    );
    $stmt->execute([$session, $from, $to]);

    $byDate = [];
    foreach ($stmt->fetchAll() as $row) {
        $byDate[$row['attendance_date']][$row['status']] = (int) $row['tally'];
    }

    $days = [];
    $cursor = new DateTimeImmutable($from);
    $end = new DateTimeImmutable($to);

    while ($cursor <= $end) {
        $date = $cursor->format('Y-m-d');
        $present = $byDate[$date]['present'] ?? 0;
        $late = $byDate[$date]['late'] ?? 0;

        $days[] = [
            'date' => $date,
            'day' => $cursor->format('D'),
            'present' => $present,
            'late' => $late,
            // A roster that shrank mid-year could otherwise go negative.
            'absent' => max(0, $enrolled - $present - $late),
        ];
        $cursor = $cursor->modify('+1 day');
    }

    return $days;
}

/** The dashboard: today at a glance, the week behind it, and the gates. */
function route_overview(): never
{
    $year = active_school_year();
    $enrolled = enrolled_count((int) $year['id']);
    $today = (string) db()->query('select curdate()')->fetchColumn();
    $week = school_week($today);

    $settings = gate_settings();
    $days = day_totals($week['monday'], $week['friday'], 'am', $enrolled);

    // Today may be a weekend, which is outside Mon-Fri entirely.
    $todayTotals = null;
    foreach ($days as $day) {
        if ($day['date'] === $today) {
            $todayTotals = $day;
        }
    }
    $todayTotals ??= day_totals($today, $today, 'am', $enrolled)[0];

    $grades = (int) db()->query('select count(*) from grade_levels')->fetchColumn();

    send(200, [
        'schoolYear' => $year['label'],
        'today' => $today,
        'enrolled' => $enrolled,
        'gradeLevels' => $grades,
        'amLateCutoffAt' => $settings['am_late_cutoff_at'],
        'week' => $days,
        'todayTotals' => $todayTotals,
        'devices' => device_rows(),
        'recentScans' => recent_scans(8),
    ]);
}

/** The newest scans across every gate, for the dashboard's live feed. */
function recent_scans(int $limit): array
{
    $limit = max(1, min(50, $limit));

    $rows = db()->query(
        "select e.id, e.direction, e.outcome, e.invalid_reason, e.scanned_at,
                e.qr_content, d.name as gate,
                s.lrn, s.last_name, s.first_name, s.middle_name, s.suffix
           from scan_events e
           join devices d on d.id = e.device_id
           left join students s on s.id = e.student_id
          order by e.scanned_at desc, e.id desc
          limit $limit"
    )->fetchAll();

    return array_map(static function (array $r): array {
        $middle = $r['middle_name'] ? ' ' . mb_substr($r['middle_name'], 0, 1) . '.' : '';
        $suffix = $r['suffix'] ? ' ' . $r['suffix'] : '';

        return [
            'id' => (int) $r['id'],
            // A refused scan may have matched no learner at all; the code it
            // carried is the only identifying thing there is.
            'name' => $r['last_name'] === null
                ? null
                : "{$r['last_name']}, {$r['first_name']}$middle$suffix",
            'lrn' => $r['lrn'],
            'direction' => $r['direction'],
            'session' => null,
            'at' => iso($r['scanned_at']),
            'gate' => $r['gate'],
            'outcome' => $r['outcome'],
            'reason' => $r['invalid_reason'],
        ];
    }, $rows);
}

/**
 * The attendance sheet's WHERE clause and its parameters.
 *
 * `$session` decides which of the two joined rows the status filter applies
 * to; the response always carries both, because the table shows the whole day.
 */
function attendance_filters(string $session): array
{
    $where = ['e.school_year_id = :year', 's.active = 1'];
    $params = [];

    $query = param('query');
    if ($query !== '') {
        // One placeholder per column: a named parameter cannot be reused in a
        // real prepared statement, only in an emulated one.
        $where[] = '(s.lrn like :q1 or s.last_name like :q2 or s.first_name like :q3'
            . " or concat(s.first_name, ' ', s.last_name) like :q4)";
        $term = like_term($query);
        $params += [':q1' => $term, ':q2' => $term, ':q3' => $term, ':q4' => $term];
    }

    $grade = param('grade');
    if ($grade !== '') {
        $where[] = 'g.name = :grade';
        $params[':grade'] = $grade;
    }

    $section = param('section');
    if ($section !== '') {
        $where[] = 'sec.name = :section';
        $params[':section'] = $section;
    }

    $status = param('status');
    if ($status !== '') {
        if (!in_array($status, ['present', 'late', 'absent'], true)) {
            fail(422, 'Status must be present, late or absent.');
        }

        // Absent is the absence of a row, not a value — see the file header.
        $where[] = $status === 'absent'
            ? "($session.id is null or $session.status = 'absent')"
            : "$session.status = :status";

        if ($status !== 'absent') {
            $params[':status'] = $status;
        }
    }

    return [implode(' and ', $where), $params];
}

/**
 * The roster for one day with both sessions attached.
 *
 * The date is bound four times over because each join needs its own named
 * placeholder, and `$session` is interpolated rather than bound — it is one of
 * two literals checked by the caller, never user text.
 */
function attendance_query(string $select, string $where, string $tail): string
{
    return "select $select
              from enrollments e
              join students s on s.id = e.student_id
              join sections sec on sec.id = e.section_id
              join grade_levels g on g.id = sec.grade_level_id
              left join attendance_daily am
                     on am.student_id = s.id and am.attendance_date = :d1
                    and am.session = 'am'
              left join attendance_daily pm
                     on pm.student_id = s.id and pm.attendance_date = :d2
                    and pm.session = 'pm'
              left join devices dam on dam.id = am.time_in_device_id
              left join devices dpm on dpm.id = pm.time_in_device_id
             where $where
             $tail";
}

/** One session of a learner's day, or null when they never scanned for it. */
function session_json(array $r, string $prefix): ?array
{
    if ($r["{$prefix}_id"] === null) {
        return null;
    }

    return [
        'timeIn' => iso($r["{$prefix}_in"]),
        'timeOut' => iso($r["{$prefix}_out"]),
        'status' => $r["{$prefix}_status"],
        'gate' => $r["{$prefix}_gate"],
    ];
}

const ATTENDANCE_COLUMNS = <<<'SQL'
    s.id as student_id, s.lrn, s.last_name, s.first_name, s.middle_name,
    s.suffix, g.name as grade_level, sec.name as section,
    am.id as am_id, am.time_in as am_in, am.time_out as am_out,
    am.status as am_status, dam.name as am_gate,
    pm.id as pm_id, pm.time_in as pm_in, pm.time_out as pm_out,
    pm.status as pm_status, dpm.name as pm_gate
SQL;

function attendance_row_json(array $r): array
{
    $middle = $r['middle_name'] ? ' ' . mb_substr($r['middle_name'], 0, 1) . '.' : '';
    $suffix = $r['suffix'] ? ' ' . $r['suffix'] : '';

    return [
        'studentId' => $r['student_id'],
        'lrn' => $r['lrn'],
        'name' => "{$r['last_name']}, {$r['first_name']}$middle$suffix",
        'gradeLevel' => $r['grade_level'],
        'section' => $r['section'],
        'am' => session_json($r, 'am'),
        'pm' => session_json($r, 'pm'),
    ];
}

/** The date and session every attendance read is anchored to. */
function attendance_scope(): array
{
    $date = param('date');
    if ($date === '') {
        $date = (string) db()->query('select curdate()')->fetchColumn();
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        fail(422, 'The date must look like 2026-09-30.');
    }

    $session = param('session', 'am');
    if (!in_array($session, ['am', 'pm'], true)) {
        fail(422, 'Session must be am or pm.');
    }

    return [$date, $session];
}

function route_attendance(): never
{
    [$date, $session] = attendance_scope();
    $year = active_school_year();
    [$where, $params] = attendance_filters($session);

    $params += [
        ':year' => $year['id'],
        ':d1' => $date,
        ':d2' => $date,
    ];

    $count = db()->prepare(attendance_query('count(*)', $where, ''));
    $count->execute($params);
    $total = (int) $count->fetchColumn();

    // Cast rather than bind: LIMIT/OFFSET placeholders arrive as strings with
    // emulated prepares off, which MySQL rejects.
    $pageSize = max(1, min(ATTENDANCE_PAGE_MAX, (int) param('pageSize', '25')));
    $page = max(0, (int) param('page', '0'));
    $offset = $page * $pageSize;

    $stmt = db()->prepare(attendance_query(
        ATTENDANCE_COLUMNS,
        $where,
        "order by s.last_name, s.first_name limit $pageSize offset $offset",
    ));
    $stmt->execute($params);

    send(200, [
        'date' => $date,
        'session' => $session,
        'rows' => array_map('attendance_row_json', $stmt->fetchAll()),
        'total' => $total,
        'totals' => attendance_totals($date, $session, (int) $year['id']),
    ]);
}

/**
 * The present / late / absent tally for the whole day, ignoring the filters —
 * the badges above the table describe the day, not the current search.
 */
function attendance_totals(string $date, string $session, int $yearId): array
{
    $enrolled = enrolled_count($yearId);
    $totals = day_totals($date, $date, $session, $enrolled)[0];

    return [
        'present' => $totals['present'],
        'late' => $totals['late'],
        'absent' => $totals['absent'],
        'enrolled' => $enrolled,
    ];
}

/**
 * The same sheet as a CSV download, filters and all, with no paging.
 *
 * Written straight to the output buffer rather than through send(), which only
 * speaks JSON.
 */
function route_attendance_csv(): never
{
    [$date, $session] = attendance_scope();
    $year = active_school_year();
    [$where, $params] = attendance_filters($session);

    $params += [
        ':year' => $year['id'],
        ':d1' => $date,
        ':d2' => $date,
    ];

    $stmt = db()->prepare(attendance_query(
        ATTENDANCE_COLUMNS,
        $where,
        'order by g.sort_order, sec.name, s.last_name, s.first_name',
    ));
    $stmt->execute($params);

    http_response_code(200);
    header('Content-Type: text/csv; charset=utf-8');
    header("Content-Disposition: attachment; filename=\"attendance-$date.csv\"");
    header('Cache-Control: no-store');

    $out = fopen('php://output', 'w');
    // Excel reads a bare UTF-8 CSV as the system codepage and mangles names.
    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, [
        'LRN', 'Name', 'Grade', 'Section',
        'Morning in', 'Morning out', 'Morning status',
        'Afternoon in', 'Afternoon out', 'Afternoon status',
    ]);

    foreach ($stmt->fetchAll() as $r) {
        $row = attendance_row_json($r);
        fputcsv($out, [
            // Quoted so a spreadsheet keeps the leading zero of an LRN.
            $row['lrn'],
            $row['name'],
            $row['gradeLevel'],
            $row['section'],
            csv_time($row['am']['timeIn'] ?? null),
            csv_time($row['am']['timeOut'] ?? null),
            $row['am']['status'] ?? 'absent',
            csv_time($row['pm']['timeIn'] ?? null),
            csv_time($row['pm']['timeOut'] ?? null),
            $row['pm']['status'] ?? 'absent',
        ]);
    }

    fclose($out);
    exit;
}

/** "2026-09-30T07:14:02" -> "07:14", or empty for a scan that never happened. */
function csv_time(?string $iso): string
{
    return $iso === null ? '' : substr($iso, 11, 5);
}
