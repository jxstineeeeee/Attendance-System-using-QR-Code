<?php

declare(strict_types=1);

/**
 * Session auth against the `users` table. Passwords are bcrypt hashes written
 * by PHP's password_hash(), so password_verify() is the only check needed.
 */

/** The shape the frontend knows a signed-in user by. */
function user_json(array $row): array
{
    return [
        'id' => $row['id'],
        'name' => $row['full_name'],
        'email' => $row['email'],
        'role' => $row['role'],
    ];
}

/** The signed-in user, or null when the session is empty or no longer valid. */
function current_user(): ?array
{
    $id = $_SESSION['user_id'] ?? null;
    if (!is_string($id) || $id === '') {
        return null;
    }

    $stmt = db()->prepare(
        'select id, full_name, email, role, status from users where id = ?'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    // An account disabled or demoted mid-session loses its session with it.
    if (!$row || $row['status'] !== 'active'
        || !in_array($row['role'], allowed_roles(), true)) {
        unset($_SESSION['user_id']);

        return null;
    }

    return $row;
}

/** Every endpoint but /auth/* goes through this. */
function require_user(): array
{
    $user = current_user();

    if ($user === null) {
        fail(401, 'Please sign in.');
    }

    return $user;
}

function log_action(
    ?string $actorId,
    string $kind,
    string $action,
    ?string $detail = null,
    ?string $entityType = null,
    ?string $entityId = null,
): void {
    $stmt = db()->prepare(
        'insert into audit_log
            (actor_id, kind, action, detail, entity_type, entity_id, ip_address)
         values (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $actorId,
        $kind,
        $action,
        $detail,
        $entityType,
        $entityId,
        $_SERVER['REMOTE_ADDR'] ?? null,
    ]);
}

function route_login(): never
{
    $email = strtolower(field('email'));
    $password = (string) (body()['password'] ?? '');

    if ($email === '' || $password === '') {
        fail(400, 'Enter your email and password.');
    }

    $stmt = db()->prepare(
        'select id, full_name, email, role, status, password_hash
           from users where email = ?'
    );
    $stmt->execute([$email]);
    $row = $stmt->fetch();

    // One message for "no such account" and "wrong password", so the form
    // cannot be used to discover which staff emails exist.
    if (!$row || $row['password_hash'] === null
        || !password_verify($password, $row['password_hash'])) {
        fail(401, 'Those credentials do not match an account.');
    }

    if ($row['status'] !== 'active') {
        fail(403, $row['status'] === 'invited'
            ? 'This account has not been activated yet. Ask your administrator.'
            : 'This account has been disabled.');
    }

    if (!in_array($row['role'], allowed_roles(), true)) {
        fail(403, 'This account does not have registrar access.');
    }

    // A fresh id on sign-in, so a session fixed before login is useless.
    session_regenerate_id(true);
    $_SESSION['user_id'] = $row['id'];

    db()->prepare('update users set last_active_at = now() where id = ?')
        ->execute([$row['id']]);
    log_action($row['id'], 'security', 'sign-in', 'Registrar app');

    send(200, ['user' => user_json($row)]);
}

function route_logout(): never
{
    $id = $_SESSION['user_id'] ?? null;
    if (is_string($id)) {
        log_action($id, 'security', 'sign-out', 'Registrar app');
    }

    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $p['path'],
            'httponly' => true,
            'samesite' => $p['samesite'],
            'secure' => $p['secure'],
        ]);
    }
    session_destroy();

    send(200, ['user' => null]);
}

/** Who the cookie belongs to; the app calls this once on first paint. */
function route_session(): never
{
    $user = current_user();

    send(200, ['user' => $user === null ? null : user_json($user)]);
}
