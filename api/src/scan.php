<?php

declare(strict_types=1);

/**
 * The gate: what happens when a QR code is held up to a scanner.
 *
 * One scan writes two things — a row in scan_events, which is the raw log of
 * everything presented to a device including rejections, and an insert or
 * update on attendance_daily, which is the learner's day. A rejected scan is
 * still logged; it just never touches attendance.
 *
 * Every clock reading comes from MySQL. PHP runs in UTC on this host while
 * MySQL runs in local time, so asking PHP for the time would put a learner on
 * the wrong side of the late cutoff.
 */

/** The single settings row that drives the gate. */
function gate_settings(): array
{
    $row = db()->query('select * from school_settings where id = 1')->fetch();

    if (!$row) {
        fail(409, 'The school settings row is missing, so the gate rules are '
            . 'unknown. Set them in the admin console.');
    }

    return $row;
}

/** now / today / the wall clock, straight from the database. */
function db_clock(): array
{
    return db()->query(
        'select now() as now, curdate() as today, curtime() as clock'
    )->fetch();
}

function device_by_code(string $code): array
{
    $stmt = db()->prepare(
        'select id, code, name, location, is_active from devices where code = ?'
    );
    $stmt->execute([$code]);
    $device = $stmt->fetch();

    if (!$device) {
        fail(404, "No scanner is registered with the code \"$code\".");
    }

    if (!$device['is_active']) {
        fail(409, "Scanner \"{$device['name']}\" has been deactivated.");
    }

    return $device;
}

/** The scanners a device can identify itself as. */
function route_devices(): never
{
    $rows = db()->query(
        'select id, code, name, location, status, last_seen_at
           from devices where is_active = 1 order by code'
    )->fetchAll();

    send(200, [
        'devices' => array_map(static fn (array $d): array => [
            'id' => (int) $d['id'],
            'code' => $d['code'],
            'name' => $d['name'],
            'location' => $d['location'],
            'status' => $d['status'],
            'lastSeen' => iso($d['last_seen_at']),
        ], $rows),
    ]);
}

/**
 * Which of the day's four windows a wall-clock time falls in, or null when it
 * falls outside all of them.
 *
 * The day runs: morning in, morning out, afternoon in, afternoon out. The
 * boundaries come from school_settings, so a school that runs a different
 * timetable changes them there rather than here.
 */
function scan_window(array $settings, string $clock): ?array
{
    if ($clock < $settings['gate_opens_at'] || $clock > $settings['gate_closes_at']) {
        return null;
    }

    // Morning arrivals: anything up to the moment morning dismissal opens.
    if ($clock < $settings['am_out_opens_at']) {
        return ['am', 'in', $clock <= $settings['am_late_cutoff_at'] ? 'ok' : 'late'];
    }

    if ($clock < $settings['am_out_closes_at']) {
        return ['am', 'out', 'ok'];
    }

    if ($clock < $settings['pm_in_opens_at']) {
        return null;
    }

    // Afternoon arrivals, up to the moment afternoon dismissal opens.
    if ($clock < $settings['pm_out_opens_at']) {
        return ['pm', 'in', $clock <= $settings['pm_late_cutoff_at'] ? 'ok' : 'late'];
    }

    return ['pm', 'out', 'ok'];
}

/** The gate times, so the scanner screen can say what it is currently doing. */
function route_gate(): never
{
    $settings = gate_settings();
    $clock = db_clock();
    $window = scan_window($settings, $clock['clock']);

    send(200, [
        'now' => iso($clock['now']),
        'gate' => [
            'opensAt' => $settings['gate_opens_at'],
            'amLateCutoffAt' => $settings['am_late_cutoff_at'],
            'amOutOpensAt' => $settings['am_out_opens_at'],
            'amOutClosesAt' => $settings['am_out_closes_at'],
            'pmInOpensAt' => $settings['pm_in_opens_at'],
            'pmLateCutoffAt' => $settings['pm_late_cutoff_at'],
            'pmOutOpensAt' => $settings['pm_out_opens_at'],
            'closesAt' => $settings['gate_closes_at'],
            'rejectRevoked' => (bool) $settings['reject_revoked_cards'],
        ],
        // What the next scan would be taken as, right now.
        'current' => $window === null ? null : [
            'session' => $window[0],
            'direction' => $window[1],
        ],
    ]);
}

/** The learner behind a QR code, with their class for the active year. */
function card_holder(string $qrContent): ?array
{
    $stmt = db()->prepare(
        'select c.id as card_id, c.status as card_status, c.student_id,
                v.lrn, v.last_name, v.first_name, v.middle_name, v.suffix,
                v.grade_level, v.section, v.active, v.photo_path
           from id_cards c
           join v_students v on v.id = c.student_id
          where c.qr_content = ?'
    );
    $stmt->execute([$qrContent]);
    $row = $stmt->fetch();

    return $row === false ? null : $row;
}

function holder_json(array $r): array
{
    $middle = $r['middle_name'] ? ' ' . mb_substr($r['middle_name'], 0, 1) . '.' : '';
    $suffix = $r['suffix'] ? ' ' . $r['suffix'] : '';

    return [
        'name' => "{$r['last_name']}, {$r['first_name']}$middle$suffix",
        'lrn' => $r['lrn'],
        'gradeSection' => trim(
            ($r['grade_level'] ?? '') . ' - ' . ($r['section'] ?? ''),
            ' -',
        ),
        'photoPath' => $r['photo_path'],
    ];
}

/** The learner's row for one session today, or null before their first scan. */
function attendance_session(
    string $studentId,
    string $today,
    string $session,
): ?array {
    $stmt = db()->prepare(
        'select id, session, time_in, time_out, status
           from attendance_daily
          where student_id = ? and attendance_date = ? and session = ?'
    );
    $stmt->execute([$studentId, $today, $session]);
    $row = $stmt->fetch();

    return $row === false ? null : $row;
}

/** Both of today's rows, for the screen's summary of the learner's day. */
function attendance_day(string $studentId, string $today): array
{
    $stmt = db()->prepare(
        'select session, time_in, time_out, status
           from attendance_daily
          where student_id = ? and attendance_date = ?'
    );
    $stmt->execute([$studentId, $today]);

    $day = [];
    foreach ($stmt->fetchAll() as $row) {
        $day[$row['session']] = [
            'timeIn' => iso($row['time_in']),
            'timeOut' => iso($row['time_out']),
            'status' => $row['status'],
        ];
    }

    return $day;
}

/**
 * Decides what this scan means, without writing anything.
 *
 * Returns [session, direction, outcome, reason], where outcome is
 * ok / late / invalid. The clock is passed in rather than read here, so the
 * decision is pure and the same inputs always give the same answer.
 *
 * `$existing` is the learner's row for the session the clock lands in, which
 * is the only row this scan can affect.
 */
function judge_scan(
    ?array $holder,
    ?array $existing,
    array $settings,
    array $clock,
): array {
    $time = $clock['clock'];
    if ($holder === null) {
        return ['am', 'in', 'invalid', 'Unknown code'];
    }

    if ($holder['card_status'] !== 'active' && $settings['reject_revoked_cards']) {
        return ['am', 'in', 'invalid', 'Revoked ID'];
    }

    if (!$holder['active']) {
        return ['am', 'in', 'invalid', 'Not an active learner'];
    }

    $window = scan_window($settings, $time);
    if ($window === null) {
        // Either side of the day, or the gap over lunch.
        $closed = $time >= $settings['am_out_closes_at']
            && $time < $settings['pm_in_opens_at']
                ? 'Gate closed for lunch'
                : 'Outside gate hours';

        return ['am', 'in', 'invalid', $closed];
    }

    [$session, $direction, $outcome] = $window;
    $label = $session === 'am' ? 'morning' : 'afternoon';

    if ($direction === 'in') {
        if ($existing !== null && $existing['time_in'] !== null) {
            return [$session, 'in', 'invalid', "Already timed in this $label"];
        }

        return [$session, 'in', $outcome, null];
    }

    if ($existing === null || $existing['time_in'] === null) {
        return [$session, 'out', 'invalid', "No $label time in"];
    }

    if ($existing['time_out'] !== null) {
        return [$session, 'out', 'invalid', "Already timed out this $label"];
    }

    // attendance_daily requires time_out > time_in, so a learner cannot leave
    // in the same second they arrived. Refuse it here rather than letting the
    // constraint turn a double scan into a server error.
    if ($existing['time_in'] >= $clock['now']) {
        return [$session, 'out', 'invalid', 'Just timed in'];
    }

    return [$session, 'out', 'ok', null];
}

/** Writes one session of the learner's day, for a scan that passed. */
function record_attendance(
    array $holder,
    ?array $existing,
    string $session,
    string $direction,
    string $outcome,
    array $clock,
    int $deviceId,
    int $yearId,
): void {
    if ($direction === 'out') {
        db()->prepare(
            'update attendance_daily
                set time_out = ?, time_out_device_id = ?
              where id = ?'
        )->execute([$clock['now'], $deviceId, $existing['id']]);

        return;
    }

    $status = $outcome === 'late' ? 'late' : 'present';

    if ($existing === null) {
        db()->prepare(
            'insert into attendance_daily
                (student_id, school_year_id, attendance_date, session, time_in,
                 time_in_device_id, status)
             values (?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $holder['student_id'],
            $yearId,
            $clock['today'],
            $session,
            $clock['now'],
            $deviceId,
            $status,
        ]);

        return;
    }

    // An absent row written ahead of time, for a learner who turned up anyway.
    db()->prepare(
        'update attendance_daily
            set time_in = ?, time_in_device_id = ?, status = ?
          where id = ?'
    )->execute([$clock['now'], $deviceId, $status, $existing['id']]);
}

/** The answer the scanner screen renders. */
function scan_json(
    string $session,
    string $direction,
    string $outcome,
    ?string $reason,
    ?array $holder,
    array $day,
    string $at,
): array {
    return [
        'outcome' => $outcome,
        'session' => $session,
        'direction' => $direction,
        'reason' => $reason,
        'at' => iso($at),
        'student' => $holder === null ? null : holder_json($holder),
        // Both halves of the learner's day, so the screen can show the whole
        // row rather than just the scan that happened.
        'day' => [
            'am' => $day['am'] ?? null,
            'pm' => $day['pm'] ?? null,
        ],
    ];
}

function route_scan(array $user): never
{
    $qrContent = field('qrContent');
    $deviceCode = field('device');
    $clientEventId = field('clientEventId');

    if ($qrContent === '') {
        fail(422, 'No QR content was sent.');
    }
    if ($deviceCode === '') {
        fail(422, 'Choose which scanner this is before scanning.');
    }
    if ($clientEventId === '') {
        $clientEventId = uuid4();
    }

    $device = device_by_code($deviceCode);
    $settings = gate_settings();
    $clock = db_clock();
    $year = active_school_year();

    $pdo = db();
    $pdo->beginTransaction();

    try {
        $holder = card_holder($qrContent);

        // Which session the clock lands in decides which row is in play; a
        // scan can only ever affect that one.
        $window = scan_window($settings, $clock['clock']);
        $session = $window[0] ?? 'am';
        $existing = $holder === null
            ? null
            : attendance_session($holder['student_id'], $clock['today'], $session);

        [$session, $direction, $outcome, $reason] = judge_scan(
            $holder,
            $existing,
            $settings,
            $clock,
        );

        if ($outcome !== 'invalid') {
            record_attendance(
                $holder,
                $existing,
                $session,
                $direction,
                $outcome,
                $clock,
                (int) $device['id'],
                (int) $year['id'],
            );
        }

        $pdo->prepare(
            'insert into scan_events
                (device_id, client_event_id, operator_id, qr_content,
                 id_card_id, student_id, direction, outcome, invalid_reason,
                 scanned_at)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $device['id'],
            $clientEventId,
            $user['id'],
            $qrContent,
            $holder['card_id'] ?? null,
            $holder['student_id'] ?? null,
            $direction,
            $outcome,
            $reason,
            $clock['now'],
        ]);

        // The device is plainly alive if it just sent a scan.
        $pdo->prepare(
            "update devices
                set last_seen_at = now(), status = 'online',
                    current_operator_id = ?
              where id = ?"
        )->execute([$user['id'], $device['id']]);

        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();

        // The same scan resent after a dropped reply: report what the first
        // one decided rather than recording it twice.
        if (duplicate_key($e, 'uq_scan_events_client')) {
            $stmt = db()->prepare(
                'select direction, outcome, invalid_reason, scanned_at
                   from scan_events
                  where device_id = ? and client_event_id = ?'
            );
            $stmt->execute([$device['id'], $clientEventId]);
            $previous = $stmt->fetch();

            if ($previous) {
                send(200, [
                    'duplicate' => true,
                ] + scan_json(
                    $session ?? 'am',
                    $previous['direction'],
                    $previous['outcome'],
                    $previous['invalid_reason'],
                    $holder ?? null,
                    [],
                    $previous['scanned_at'],
                ));
            }
        }

        throw $e;
    }

    // Re-read the day so the screen shows the times that were just written.
    $day = $holder === null
        ? []
        : attendance_day($holder['student_id'], $clock['today']);

    send(201, scan_json(
        $session,
        $direction,
        $outcome,
        $reason,
        $holder,
        $day,
        $clock['now'],
    ));
}
