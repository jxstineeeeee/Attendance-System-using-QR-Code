<?php

declare(strict_types=1);

/**
 * The gate devices, for both apps that care about them.
 *
 * The scanner asks which gate a tablet may call itself; the admin console
 * pairs them, renames them and retires them. Both read through
 * `v_device_today`, which carries the operator's name and the day's scan count
 * alongside the row.
 */

/** The scanners a device can identify itself as — the scanner's pick-list. */
function route_scanner_devices(): never
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

/** Every gate, retired ones included, as the console lists them. */
function device_rows(): array
{
    $rows = db()->query(
        'select * from v_device_today order by is_active desc, code'
    )->fetchAll();

    return array_map(static fn (array $d): array => [
        'id' => (int) $d['id'],
        'code' => $d['code'],
        'name' => $d['name'],
        'location' => $d['location'],
        // A device that was never retired but has not reported in is still
        // "offline"; the column says what it last claimed.
        'status' => $d['is_active'] ? $d['status'] : 'offline',
        'lastSeen' => iso($d['last_seen_at']),
        'scansToday' => (int) $d['scans_today'],
        'pendingSync' => (int) $d['pending_sync'],
        'operator' => $d['operator'],
        'isActive' => (bool) $d['is_active'],
    ], $rows);
}

function route_list_devices(): never
{
    send(200, ['devices' => device_rows()]);
}

/** The code is the device's identity: the scanner signs in with it. */
function valid_device_code(string $code): void
{
    if (!preg_match('/^[A-Z0-9][A-Z0-9-]{2,29}$/', $code)) {
        fail(422, 'A device code is 3-30 characters: capitals, digits and '
            . 'hyphens, e.g. LNHS-GATE-01.');
    }
}

function route_pair_device(array $user): never
{
    $code = strtoupper(field('code'));
    $name = field('name');

    valid_device_code($code);
    if ($name === '') {
        fail(422, 'Give the device a name, e.g. "Main Gate — Scanner 1".');
    }

    try {
        $stmt = db()->prepare(
            'insert into devices (code, name, location) values (?, ?, ?)'
        );
        $stmt->execute([$code, $name, nullable('location')]);
    } catch (PDOException $e) {
        if (duplicate_key($e, 'uq_devices_code')) {
            fail(409, "A device with the code \"$code\" is already paired.");
        }

        throw $e;
    }

    $id = (int) db()->lastInsertId();
    log_action($user['id'], 'device', 'pair', "$code — $name", 'device', (string) $id);

    send(201, ['id' => $id]);
}

function route_update_device(array $user, string $rawId): never
{
    $id = (int) $rawId;
    $stmt = db()->prepare('select * from devices where id = ?');
    $stmt->execute([$id]);
    $device = $stmt->fetch();

    if (!$device) {
        fail(404, 'No device with that id.');
    }

    $sets = [];
    $params = [];
    $changes = [];

    if (array_key_exists('name', body())) {
        $name = field('name');
        if ($name === '') {
            fail(422, 'A device cannot have an empty name.');
        }
        $sets[] = 'name = ?';
        $params[] = $name;
        $changes[] = "renamed to \"$name\"";
    }

    if (array_key_exists('location', body())) {
        $sets[] = 'location = ?';
        $params[] = nullable('location');
        $changes[] = 'location changed';
    }

    if (array_key_exists('isActive', body())) {
        $active = body()['isActive'];
        if (!is_bool($active)) {
            fail(400, 'Send { "isActive": true } or { "isActive": false }.');
        }
        $sets[] = 'is_active = ?';
        $params[] = $active ? 1 : 0;
        $changes[] = $active ? 'returned to service' : 'retired';

        // A retired gate has nobody standing at it.
        if (!$active) {
            $sets[] = "status = 'offline'";
            $sets[] = 'current_operator_id = null';
        }
    }

    if ($sets === []) {
        fail(400, 'Nothing to change.');
    }

    $params[] = $id;
    db()->prepare('update devices set ' . implode(', ', $sets) . ' where id = ?')
        ->execute($params);

    log_action(
        $user['id'],
        'device',
        'update',
        $device['code'] . ' — ' . implode(', ', $changes),
        'device',
        (string) $id,
    );

    send(200, ['ok' => true]);
}

/** The scans one gate took today, behind the console's "View scans". */
function route_device_scans(string $rawId): never
{
    $id = (int) $rawId;
    $stmt = db()->prepare('select code from devices where id = ?');
    $stmt->execute([$id]);

    if (!$stmt->fetchColumn()) {
        fail(404, 'No device with that id.');
    }

    $rows = db()->prepare(
        "select e.id, e.direction, e.outcome, e.invalid_reason, e.scanned_at,
                d.name as gate,
                s.lrn, s.last_name, s.first_name, s.middle_name, s.suffix
           from scan_events e
           join devices d on d.id = e.device_id
           left join students s on s.id = e.student_id
          where e.device_id = ? and e.scanned_at >= curdate()
            and e.scanned_at < curdate() + interval 1 day
          order by e.scanned_at desc, e.id desc
          limit 200"
    );
    $rows->execute([$id]);

    send(200, ['scans' => array_map(static function (array $r): array {
        $middle = $r['middle_name'] ? ' ' . mb_substr($r['middle_name'], 0, 1) . '.' : '';
        $suffix = $r['suffix'] ? ' ' . $r['suffix'] : '';

        return [
            'id' => (int) $r['id'],
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
    }, $rows->fetchAll())]);
}
