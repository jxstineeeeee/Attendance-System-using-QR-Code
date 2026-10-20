<?php

declare(strict_types=1);

/**
 * Sets (or resets) a staff account's password from the command line, because
 * the app has no public sign-up and `users.password_hash` must be a bcrypt
 * hash that PHP's password_verify() accepts.
 *
 *   php api/tools/set-password.php r.gundran@lunanhs.edu.ph "new password"
 *
 * An account still "invited" becomes "active" once it has a password.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit("This script only runs from the command line.\n");
}

require __DIR__ . '/../src/bootstrap.php';

[$email, $password] = [$argv[1] ?? '', $argv[2] ?? ''];

if ($email === '' || $password === '') {
    exit("Usage: php api/tools/set-password.php <email> <password>\n");
}

if (strlen($password) < 8) {
    exit("Pick a password of at least 8 characters.\n");
}

$stmt = db()->prepare('select id, full_name, role, status from users where email = ?');
$stmt->execute([strtolower($email)]);
$user = $stmt->fetch();

if (!$user) {
    $known = db()->query('select email, role from users order by email')->fetchAll();
    echo "No account with that email. The accounts in this database are:\n";
    foreach ($known as $row) {
        printf("  %-30s %s\n", $row['email'], $row['role']);
    }
    exit(1);
}

db()->prepare(
    "update users
        set password_hash = ?,
            status = case when status = 'invited' then 'active' else status end
      where id = ?"
)->execute([password_hash($password, PASSWORD_BCRYPT), $user['id']]);

printf(
    "Password set for %s (%s, %s).\n",
    $user['full_name'],
    $email,
    $user['role'],
);

if ($user['status'] === 'disabled') {
    echo "Note: this account is disabled and still cannot sign in.\n";
}
