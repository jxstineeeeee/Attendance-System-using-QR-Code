<?php

declare(strict_types=1);

/**
 * Shared plumbing for the JSON API: configuration, the PDO handle, the session
 * cookie, and the request/response helpers every endpoint uses.
 */

const API_ROOT = __DIR__ . '/..';

/** Roles that may sign in to the registrar app. */
function allowed_roles(): array
{
    return config()['roles'] ?? ['registrar', 'admin'];
}

function config(): array
{
    static $config = null;

    if ($config === null) {
        $path = API_ROOT . '/config.php';
        if (!is_file($path)) {
            fail(500, 'Missing api/config.php. Copy api/config.example.php to '
                . 'api/config.php and fill in your MySQL credentials.');
        }
        $config = require $path;
    }

    return $config;
}

function db(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $c = config()['db'];
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $c['host'],
            $c['port'],
            $c['name'],
        );

        try {
            $pdo = new PDO($dsn, $c['user'], $c['pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                // Real prepares, so MySQL types survive the round trip and the
                // placeholders are never interpolated by PDO itself.
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            fail(503, 'Cannot reach MySQL: ' . $e->getMessage());
        }
    }

    return $pdo;
}

/** Sends a JSON body and ends the request. */
function send(int $status, mixed $body): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** The one error shape the frontend reads: { "error": "…" }. */
function fail(int $status, string $message): never
{
    send($status, ['error' => $message]);
}

/** The decoded JSON request body, or an empty array for anything else. */
function body(): array
{
    static $body = null;

    if ($body === null) {
        $raw = file_get_contents('php://input');
        $decoded = $raw === '' || $raw === false ? null : json_decode($raw, true);
        $body = is_array($decoded) ? $decoded : [];
    }

    return $body;
}

/** A trimmed string from the JSON body. */
function field(string $key, string $default = ''): string
{
    $value = body()[$key] ?? $default;

    return is_scalar($value) ? trim((string) $value) : $default;
}

/** A trimmed string from the query string. */
function param(string $key, string $default = ''): string
{
    $value = $_GET[$key] ?? $default;

    return is_scalar($value) ? trim((string) $value) : $default;
}

/** Optional text column: an empty form field is stored as NULL, not ''. */
function nullable(string $key): ?string
{
    $value = field($key);

    return $value === '' ? null : $value;
}

function uuid4(): string
{
    $b = random_bytes(16);
    $b[6] = chr(ord($b[6]) & 0x0f | 0x40); // version 4
    $b[8] = chr(ord($b[8]) & 0x3f | 0x80); // variant 1

    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

/**
 * MySQL hands back "2026-06-08 07:14:02"; JavaScript's Date only parses that
 * reliably with the T separator. No offset is appended on purpose — these are
 * school-local wall-clock times.
 */
function iso(?string $datetime): ?string
{
    return $datetime === null ? null : str_replace(' ', 'T', $datetime);
}

/** True when a PDO failure is a duplicate-key violation. */
function is_duplicate(PDOException $e): bool
{
    return ($e->errorInfo[1] ?? 0) === 1062;
}

/** True when a duplicate-key violation names a particular index. */
function duplicate_key(PDOException $e, string $index): bool
{
    return is_duplicate($e) && str_contains((string) ($e->errorInfo[2] ?? ''), $index);
}

/**
 * The session cookie is pinned to "/" so it survives the dev setup, where the
 * browser sees the API under /api (the Vite proxy) but Apache serves it from
 * its own alias.
 */
function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_name('qr_attendance_sid');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']),
    ]);
    session_start();
}

/** Answers the browser's preflight and allows cookies from the dev server. */
function handle_cors(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origin !== '' && in_array($origin, config()['cors_origins'] ?? [], true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
        header('Vary: Origin');
    }

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Turns anything uncaught into the same JSON shape as a deliberate failure —
 * an HTML error page would reach the frontend as an unreadable parse error.
 */
function install_error_handlers(): void
{
    set_exception_handler(function (Throwable $e): void {
        error_log('[qr-attendance-api] ' . $e);

        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }

        echo json_encode([
            'error' => 'Server error: ' . $e->getMessage(),
        ]);
    });

    set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
        throw new ErrorException($message, 0, $severity, $file, $line);
    });
}
