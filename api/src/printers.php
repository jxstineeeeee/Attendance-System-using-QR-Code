<?php

declare(strict_types=1);

/**
 * The printers installed on the machine that runs this API.
 *
 * A browser cannot enumerate printers — there is no web API for it, and the
 * system print dialog is the only place a page can influence printer choice.
 * So the list has to come from the server. In this deployment Apache runs on
 * the registrar's own PC, so "the server's printers" and "the printers on this
 * device" are the same list. Move the API to another machine and this endpoint
 * describes that machine instead.
 */

/** Ports that mean "this does not put ink on a card". */
const VIRTUAL_PORTS = ['nul:', 'PORTPROMPT:', 'FILE:', 'SHRFAX:'];

function is_virtual_port(string $port): bool
{
    foreach (VIRTUAL_PORTS as $virtual) {
        if (strcasecmp($port, $virtual) === 0) {
            return true;
        }
    }

    // Packaged printers (OneNote, Print to PDF variants) carry a port like
    // Microsoft.Office.OneNoteVirtualPrinter_…
    return stripos($port, 'Microsoft.') === 0
        || stripos($port, 'VirtualPrinter') !== false;
}

/**
 * Asks Windows for its printer list. Returns [printers, note]; the note
 * explains an empty list rather than leaving the screen guessing.
 */
function windows_printers(): array
{
    if (PHP_OS_FAMILY !== 'Windows') {
        return [[], 'Printer discovery is only implemented for Windows hosts.'];
    }

    if (!function_exists('shell_exec') || in_array(
        'shell_exec',
        array_map('trim', explode(',', (string) ini_get('disable_functions'))),
        true,
    )) {
        return [[], 'PHP cannot run shell commands here, so printers cannot be listed.'];
    }

    // No user input reaches this command — it is a fixed query.
    $command = 'powershell -NoProfile -NonInteractive -Command '
        . '"Get-CimInstance Win32_Printer | Select-Object Name,Default,WorkOffline,PortName '
        . '| ConvertTo-Json -Compress" 2>&1';

    $output = shell_exec($command);
    if (!is_string($output) || trim($output) === '') {
        return [[], 'Windows returned no printers for the account Apache runs as.'];
    }

    $decoded = json_decode(trim($output), true);
    if (!is_array($decoded)) {
        return [[], 'Could not read the printer list from Windows.'];
    }

    // ConvertTo-Json emits a bare object when there is exactly one printer.
    if (isset($decoded['Name'])) {
        $decoded = [$decoded];
    }

    $printers = [];
    foreach ($decoded as $row) {
        if (!is_array($row) || !isset($row['Name'])) {
            continue;
        }
        $port = (string) ($row['PortName'] ?? '');
        $printers[] = [
            'name' => (string) $row['Name'],
            'isDefault' => (bool) ($row['Default'] ?? false),
            'offline' => (bool) ($row['WorkOffline'] ?? false),
            'port' => $port,
            'virtual' => is_virtual_port($port),
        ];
    }

    return [$printers, null];
}

function route_printers(): never
{
    // The list barely changes and the WMI query is the slow part of the
    // screen, so hold it briefly per signed-in session.
    $cached = $_SESSION['printers'] ?? null;
    if (is_array($cached) && (time() - (int) $cached['at']) < 60) {
        send(200, $cached['body']);
    }

    [$printers, $note] = windows_printers();

    $body = [
        'printers' => $printers,
        'host' => php_uname('n'),
        'note' => $note,
    ];
    $_SESSION['printers'] = ['at' => time(), 'body' => $body];

    send(200, $body);
}
