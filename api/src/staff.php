<?php

declare(strict_types=1);

/**
 * Staff accounts: who can sign in, as what, and whether they still may.
 *
 * There is no sign-up and no mailer. An account is created `invited` with no
 * password, and becomes `active` the moment a password is set — either here or
 * by `tools/set-password.php`. Nothing in this file sends an email, so nothing
 * in the console claims one was sent.
 *
 * Two rules keep an administrator from locking everybody out, and both are
 * checked here rather than trusted to the UI: you cannot disable or demote
 * your own account, and you cannot remove the last active administrator.
 */

function staff_json(array $r, string $currentUserId): array
{
    return [
        'id' => $r['id'],
        'name' => $r['full_name'],
        'email' => $r['email'],
        'role' => $r['role'],
        'status' => $r['status'],
        'lastActive' => iso($r['last_active_at']),
        'createdOn' => iso($r['created_at']),
        'canDisable' => $r['id'] !== $currentUserId,
    ];
}

function route_list_staff(array $user): never
{
    $where = [];
    $params = [];

    $query = param('query');
    if ($query !== '') {
        $where[] = '(full_name like :q1 or email like :q2)';
        $term = like_term($query);
        $params += [':q1' => $term, ':q2' => $term];
    }

    foreach (['role' => 'role', 'status' => 'status'] as $name => $column) {
        $value = param($name);
        if ($value !== '') {
            $where[] = "$column = :$name";
            $params[":$name"] = $value;
        }
    }

    $clause = $where ? 'where ' . implode(' and ', $where) : '';
    $stmt = db()->prepare(
        "select id, full_name, email, role, status, last_active_at, created_at
           from users $clause order by full_name"
    );
    $stmt->execute($params);

    send(200, [
        'rows' => array_map(
            static fn (array $r): array => staff_json($r, $user['id']),
            $stmt->fetchAll(),
        ),
    ]);
}

/** How many administrators could still sign in if this one were removed. */
function other_active_admins(string $exceptId): int
{
    $stmt = db()->prepare(
        "select count(*) from users
          where role = 'admin' and status = 'active' and id <> ?"
    );
    $stmt->execute([$exceptId]);

    return (int) $stmt->fetchColumn();
}

function valid_role(string $role): void
{
    if (!in_array($role, ['admin', 'registrar', 'scanner'], true)) {
        fail(422, 'Role must be admin, registrar or scanner.');
    }
}

function route_create_staff(array $user): never
{
    $name = field('name');
    $email = strtolower(field('email'));
    $role = field('role');

    if ($name === '') {
        fail(422, 'Enter the person\'s full name.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fail(422, 'Enter a valid email address.');
    }
    valid_role($role);

    $id = uuid4();

    try {
        db()->prepare(
            "insert into users (id, full_name, email, role, status, invited_by)
             values (?, ?, ?, ?, 'invited', ?)"
        )->execute([$id, $name, $email, $role, $user['id']]);
    } catch (PDOException $e) {
        if (duplicate_key($e, 'uq_users_email')) {
            fail(409, 'An account with that email already exists.');
        }

        throw $e;
    }

    log_action($user['id'], 'account', 'invite', "$email — role: $role", 'user', $id);

    send(201, ['id' => $id]);
}

function route_update_staff(array $user, string $id): never
{
    $stmt = db()->prepare('select * from users where id = ?');
    $stmt->execute([$id]);
    $target = $stmt->fetch();

    if (!$target) {
        fail(404, 'No account with that id.');
    }

    $sets = [];
    $params = [];
    $changes = [];
    $isSelf = $target['id'] === $user['id'];

    if (array_key_exists('name', body())) {
        $name = field('name');
        if ($name === '') {
            fail(422, 'An account cannot have an empty name.');
        }
        $sets[] = 'full_name = ?';
        $params[] = $name;
        $changes[] = "renamed to \"$name\"";
    }

    if (array_key_exists('role', body())) {
        $role = field('role');
        valid_role($role);

        if ($role !== $target['role']) {
            if ($isSelf) {
                fail(409, 'You cannot change your own role. Ask another '
                    . 'administrator to do it.');
            }
            if ($target['role'] === 'admin' && $target['status'] === 'active'
                && other_active_admins($target['id']) === 0) {
                fail(409, 'This is the last active administrator. Promote '
                    . 'someone else before changing this account.');
            }

            $sets[] = 'role = ?';
            $params[] = $role;
            $changes[] = "role changed to $role";
        }
    }

    if (array_key_exists('status', body())) {
        $status = field('status');
        if (!in_array($status, ['active', 'disabled'], true)) {
            fail(422, 'Status must be active or disabled. An account becomes '
                . 'active by being given a password, not by being set to it.');
        }

        if ($status !== $target['status']) {
            if ($status === 'disabled') {
                if ($isSelf) {
                    fail(409, 'You cannot disable your own account.');
                }
                if ($target['role'] === 'admin'
                    && other_active_admins($target['id']) === 0) {
                    fail(409, 'This is the last active administrator. There '
                        . 'would be nobody left who can manage the system.');
                }
            }

            // An account with no password has never been set up; letting it
            // go "active" would be a sign-in that can never succeed.
            if ($status === 'active' && $target['password_hash'] === null) {
                fail(409, 'This account has no password yet. Set one and it '
                    . 'becomes active on its own.');
            }

            $sets[] = 'status = ?';
            $params[] = $status;
            $changes[] = $status === 'disabled' ? 'disabled' : 'enabled';
        }
    }

    if ($sets === []) {
        fail(400, 'Nothing to change.');
    }

    $params[] = $id;
    db()->prepare('update users set ' . implode(', ', $sets) . ' where id = ?')
        ->execute($params);

    log_action(
        $user['id'],
        'account',
        'update',
        $target['email'] . ' — ' . implode(', ', $changes),
        'user',
        $id,
    );

    send(200, ['ok' => true]);
}

/**
 * Sets or resets a password. This is the only way an invited account becomes
 * usable, since there is no mailer to send an invitation link.
 */
function route_set_staff_password(array $user, string $id): never
{
    $password = (string) (body()['password'] ?? '');

    if (strlen($password) < 8) {
        fail(422, 'Pick a password of at least 8 characters.');
    }

    $stmt = db()->prepare('select email, status from users where id = ?');
    $stmt->execute([$id]);
    $target = $stmt->fetch();

    if (!$target) {
        fail(404, 'No account with that id.');
    }

    db()->prepare(
        "update users
            set password_hash = ?,
                status = case when status = 'invited' then 'active' else status end
          where id = ?"
    )->execute([password_hash($password, PASSWORD_BCRYPT), $id]);

    // The password itself never reaches the audit trail, only the fact.
    log_action(
        $user['id'],
        'security',
        $target['status'] === 'invited' ? 'set-password' : 'reset-password',
        $target['email'],
        'user',
        $id,
    );

    send(200, [
        'ok' => true,
        'nowActive' => $target['status'] === 'invited',
        'stillDisabled' => $target['status'] === 'disabled',
    ]);
}
