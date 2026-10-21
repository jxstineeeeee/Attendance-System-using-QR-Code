<?php

/**
 * Copy to api/config.php and adjust. config.php is gitignored because it holds
 * the database password; this file is the committed template.
 *
 * The defaults match a stock Laragon install (MySQL on 3306, root, no password).
 */

return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'qr_attendance',
        'user' => 'root',
        'pass' => '',
    ],

    /**
     * Browser origins allowed to call the API with session cookies. The Vite
     * dev server proxies /api to Apache, so requests arrive same-origin and
     * this list stays unused unless you point the frontend straight at Apache.
     */
    'cors_origins' => [
        // registrar, scanner, admin
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost:5175',
        'http://127.0.0.1:5175',
    ],

    /**
     * Which roles may sign in to each frontend. The login request names the
     * app it is for, and every endpoint checks the role again, so a scanner
     * account cannot reach the registrar's data by pointing at its URL.
     */
    'apps' => [
        'registrar' => ['registrar', 'admin'],
        'scanner' => ['scanner', 'admin'],
        // The console that manages the other two; admins only.
        'admin' => ['admin'],
    ],
];
