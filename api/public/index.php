<?php

declare(strict_types=1);

/**
 * Front controller for the QR Attendance API. Everything under this directory
 * is rewritten here by .htaccess, so the path after the script is the route.
 */

require __DIR__ . '/../src/bootstrap.php';
require __DIR__ . '/../src/auth.php';
require __DIR__ . '/../src/students.php';
require __DIR__ . '/../src/cards.php';
require __DIR__ . '/../src/options.php';
require __DIR__ . '/../src/printers.php';

install_error_handlers();
handle_cors();
start_session();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// SCRIPT_NAME is /<alias>/index.php, so its directory is the API root and
// whatever follows in the URL is the route. Works under any alias or subfolder.
$uri = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
$path = $base !== '' && str_starts_with($uri, $base)
    ? substr($uri, strlen($base))
    : $uri;
$segments = array_values(array_filter(explode('/', trim($path, '/')), 'strlen'));

/** Rejects a known route reached with the wrong verb. */
$allow = static function (string ...$methods) use ($method): void {
    if (!in_array($method, $methods, true)) {
        header('Allow: ' . implode(', ', $methods));
        fail(405, "$method is not allowed here.");
    }
};

switch (true) {
    // GET / — a readable "the API is up" page for the browser.
    case $segments === []:
        send(200, [
            'name' => 'QR Attendance API',
            'database' => config()['db']['name'],
            'signedIn' => current_user() !== null,
        ]);

        // no break — send() exits

    // GET /health — connectivity check that touches MySQL.
    case $segments === ['health']:
        $allow('GET');
        send(200, [
            'ok' => true,
            'mysql' => db()->query('select version()')->fetchColumn(),
        ]);

    case $segments === ['auth', 'login']:
        $allow('POST');
        route_login();

    case $segments === ['auth', 'logout']:
        $allow('POST');
        route_logout();

    case $segments === ['auth', 'session']:
        $allow('GET');
        route_session();

    case $segments === ['options']:
        $allow('GET');
        require_user();
        route_options();

    case $segments === ['printers']:
        $allow('GET');
        require_user();
        route_printers();

    // Checked before /students/{id}: no uuid is ever "lrn-taken".
    case $segments === ['students', 'lrn-taken']:
        $allow('GET');
        require_user();
        route_lrn_taken();

    case $segments === ['students']:
        $allow('GET', 'POST');
        $user = require_user();
        $method === 'GET' ? route_list_students() : route_create_student($user);

    case count($segments) === 2 && $segments[0] === 'students':
        $allow('GET', 'PATCH');
        $user = require_user();
        $method === 'GET'
            ? route_get_student($segments[1])
            : route_set_student_active($user, $segments[1]);

    case count($segments) === 3 && $segments[0] === 'students'
        && $segments[2] === 'cards':
        $allow('POST');
        route_issue_card(require_user(), $segments[1]);

    case count($segments) === 3 && $segments[0] === 'students'
        && $segments[2] === 'reissue':
        $allow('POST');
        route_reissue_card(require_user(), $segments[1]);

    case count($segments) === 3 && $segments[0] === 'students'
        && $segments[2] === 'revoke':
        $allow('POST');
        route_revoke_student_card(require_user(), $segments[1]);

    case count($segments) === 2 && $segments[0] === 'cards':
        $allow('PATCH');
        route_revoke_card(require_user(), $segments[1]);

    default:
        fail(404, "No route for $method /" . implode('/', $segments) . '.');
}
