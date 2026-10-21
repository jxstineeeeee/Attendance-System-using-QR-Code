<?php

declare(strict_types=1);

/**
 * The single `school_settings` row, and the audit trail that records changes
 * to it.
 *
 * The gate reads these times on every scan (see scan.php), so saving here
 * changes what the next learner's scan means — there is no sync step and no
 * cached copy on the device. The ordering of the eight times is a CHECK
 * constraint, not PHP: `chk_settings_gate_order`.
 */

/** The school's own name and address — served without a session. */
function route_school(): never
{
    $row = db()->query(
        'select school_name, school_code, address from school_settings where id = 1'
    )->fetch();

    $year = db()->query(
        'select label from school_years where is_active = 1 limit 1'
    )->fetch();

    send(200, [
        'name' => $row ? $row['school_name'] : 'QR Attendance',
        'schoolId' => $row ? $row['school_code'] : null,
        'address' => $row ? $row['address'] : null,
        'schoolYear' => $year ? $year['label'] : null,
    ]);
}

/** The eight gate times, in the order the constraint requires them. */
const GATE_TIMES = [
    'gateOpensAt' => 'gate_opens_at',
    'amLateCutoffAt' => 'am_late_cutoff_at',
    'amOutOpensAt' => 'am_out_opens_at',
    'amOutClosesAt' => 'am_out_closes_at',
    'pmInOpensAt' => 'pm_in_opens_at',
    'pmLateCutoffAt' => 'pm_late_cutoff_at',
    'pmOutOpensAt' => 'pm_out_opens_at',
    'gateClosesAt' => 'gate_closes_at',
];

const GATE_RULES = [
    'rejectRevokedCards' => 'reject_revoked_cards',
    'requireTimeOut' => 'require_time_out',
    'smsOnTimeIn' => 'sms_on_time_in',
    'smsOnAbsent' => 'sms_on_absent',
];

function settings_json(array $r): array
{
    $json = [
        'schoolName' => $r['school_name'],
        'schoolId' => $r['school_code'],
        'address' => $r['address'],
    ];

    foreach (GATE_TIMES as $key => $column) {
        $json[$key] = $r[$column];
    }
    foreach (GATE_RULES as $key => $column) {
        $json[$key] = (bool) $r[$column];
    }

    $json['updatedAt'] = iso($r['updated_at']);

    return $json;
}

function route_settings(): never
{
    send(200, ['settings' => settings_json(gate_settings())]);
}

/** "07:20" from a time input, widened to the "07:20:00" the column holds. */
function time_value(string $key): string
{
    $value = field($key);

    if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', $value)) {
        fail(422, "$key must be a time like 07:20.");
    }

    return strlen($value) === 5 ? "$value:00" : $value;
}

function route_update_settings(array $user): never
{
    $current = gate_settings();
    $sets = [];
    $params = [];
    $changes = [];

    foreach (['schoolName' => 'school_name', 'schoolId' => 'school_code',
        'address' => 'address'] as $key => $column) {
        if (!array_key_exists($key, body())) {
            continue;
        }

        $value = field($key);
        if ($value === '') {
            fail(422, 'The school name, ID and address are all required.');
        }
        if ($value !== $current[$column]) {
            $sets[] = "$column = ?";
            $params[] = $value;
            $changes[] = "$column set to \"$value\"";
        }
    }

    foreach (GATE_TIMES as $key => $column) {
        if (!array_key_exists($key, body())) {
            continue;
        }

        $value = time_value($key);
        if ($value !== $current[$column]) {
            $sets[] = "$column = ?";
            $params[] = $value;
            $changes[] = sprintf(
                '%s %s -> %s',
                $column,
                substr($current[$column], 0, 5),
                substr($value, 0, 5),
            );
        }
    }

    foreach (GATE_RULES as $key => $column) {
        if (!array_key_exists($key, body())) {
            continue;
        }

        $value = body()[$key];
        if (!is_bool($value)) {
            fail(400, "$key must be true or false.");
        }
        if ($value !== (bool) $current[$column]) {
            $sets[] = "$column = ?";
            $params[] = $value ? 1 : 0;
            $changes[] = $column . ' ' . ($value ? 'on' : 'off');
        }
    }

    if ($sets === []) {
        send(200, ['settings' => settings_json($current), 'changed' => false]);
    }

    $sets[] = 'updated_by = ?';
    $params[] = $user['id'];

    try {
        db()->prepare(
            'update school_settings set ' . implode(', ', $sets) . ' where id = 1'
        )->execute($params);
    } catch (PDOException $e) {
        // chk_settings_gate_order: the eight times must run in order.
        if (($e->errorInfo[1] ?? 0) === 3819) {
            fail(422, 'Those times are out of order. The day has to run: gate '
                . 'opens, morning cut-off, morning dismissal opens and closes, '
                . 'afternoon arrival opens, afternoon cut-off, afternoon '
                . 'dismissal opens, gate closes.');
        }

        throw $e;
    }

    // Truncated to the column width; the whole list is rarely needed, and the
    // row itself carries the new values.
    log_action(
        $user['id'],
        'settings',
        'update',
        mb_substr(implode('; ', $changes), 0, 500),
    );

    send(200, ['settings' => settings_json(gate_settings()), 'changed' => true]);
}

/* -------------------------------------------------------------- Audit log */

const AUDIT_PAGE_MAX = 200;

function route_audit(): never
{
    $where = [];
    $params = [];

    $query = param('query');
    if ($query !== '') {
        $where[] = '(u.full_name like :q1 or a.action like :q2'
            . ' or a.detail like :q3)';
        $term = like_term($query);
        $params += [':q1' => $term, ':q2' => $term, ':q3' => $term];
    }

    $kind = param('kind');
    if ($kind !== '') {
        $where[] = 'a.kind = :kind';
        $params[':kind'] = $kind;
    }

    $from = param('from');
    if ($from !== '') {
        $where[] = 'a.occurred_at >= :from';
        $params[':from'] = "$from 00:00:00";
    }

    $clause = $where ? 'where ' . implode(' and ', $where) : '';

    $count = db()->prepare(
        "select count(*) from audit_log a
           left join users u on u.id = a.actor_id $clause"
    );
    $count->execute($params);
    $total = (int) $count->fetchColumn();

    $pageSize = max(1, min(AUDIT_PAGE_MAX, (int) param('pageSize', '50')));
    $page = max(0, (int) param('page', '0'));
    $offset = $page * $pageSize;

    $stmt = db()->prepare(
        "select a.id, a.occurred_at, a.kind, a.action, a.detail,
                u.full_name as actor
           from audit_log a
           left join users u on u.id = a.actor_id
           $clause
          order by a.occurred_at desc, a.id desc
          limit $pageSize offset $offset"
    );
    $stmt->execute($params);

    send(200, [
        'rows' => array_map(static fn (array $r): array => [
            'id' => (int) $r['id'],
            'at' => iso($r['occurred_at']),
            // An actor whose account was deleted leaves the entry standing.
            'actor' => $r['actor'],
            'kind' => $r['kind'],
            'action' => $r['action'],
            'detail' => $r['detail'],
        ], $stmt->fetchAll()),
        'total' => $total,
    ]);
}

/** The same log as a CSV download, filters and all, newest first. */
function route_audit_csv(): never
{
    $where = [];
    $params = [];

    $kind = param('kind');
    if ($kind !== '') {
        $where[] = 'a.kind = :kind';
        $params[':kind'] = $kind;
    }

    $query = param('query');
    if ($query !== '') {
        $where[] = '(u.full_name like :q1 or a.action like :q2'
            . ' or a.detail like :q3)';
        $term = like_term($query);
        $params += [':q1' => $term, ':q2' => $term, ':q3' => $term];
    }

    $clause = $where ? 'where ' . implode(' and ', $where) : '';

    $stmt = db()->prepare(
        "select a.occurred_at, a.kind, a.action, a.detail,
                u.full_name as actor
           from audit_log a
           left join users u on u.id = a.actor_id
           $clause
          order by a.occurred_at desc, a.id desc"
    );
    $stmt->execute($params);

    $today = (string) db()->query('select curdate()')->fetchColumn();

    http_response_code(200);
    header('Content-Type: text/csv; charset=utf-8');
    header("Content-Disposition: attachment; filename=\"audit-log-$today.csv\"");
    header('Cache-Control: no-store');

    $out = fopen('php://output', 'w');
    // Excel reads a bare UTF-8 CSV as the system codepage and mangles names.
    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, ['When', 'Who', 'Category', 'Action', 'Detail']);

    foreach ($stmt->fetchAll() as $r) {
        fputcsv($out, [
            $r['occurred_at'],
            $r['actor'] ?? 'Deleted account',
            $r['kind'],
            $r['action'],
            $r['detail'] ?? '',
        ]);
    }

    fclose($out);
    exit;
}
