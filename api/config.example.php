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
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],

    /** Roles allowed to sign in to the registrar app. */
    'roles' => ['registrar', 'admin'],
];
