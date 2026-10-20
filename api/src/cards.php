<?php

declare(strict_types=1);

/**
 * ID card issue / revoke / reissue.
 *
 * Two rules live in MySQL rather than here: a partial unique index keeps one
 * active card per student, and triggers on id_cards recompute
 * students.id_status. Nothing in this file writes id_status.
 */

function card_json(array $r): array
{
    return [
        'id' => $r['id'],
        'qrContent' => $r['qr_content'],
        'issued' => iso($r['issued_on']),
        'status' => $r['status'],
        'reason' => $r['revoked_reason'],
        'printer' => $r['printer_name'],
    ];
}

function cards_for_student(string $studentId): array
{
    $stmt = db()->prepare(
        'select id, qr_content, status, revoked_reason, revoked_at, issued_on,
                printer_name
           from id_cards where student_id = ? order by issued_on desc, id'
    );
    $stmt->execute([$studentId]);

    return array_map('card_json', $stmt->fetchAll());
}

/** Card codes look like 136743020001-A7F2 — the LRN plus four hex digits. */
function new_qr_content(string $lrn): string
{
    return $lrn . '-' . strtoupper(bin2hex(random_bytes(2)));
}

/**
 * Inserts an active card. Callers own the transaction. A collision on the
 * random code is retried; a collision on the one-active-card index is the
 * caller's problem to report.
 *
 * `$printer` is the printer the registrar had selected. It is recorded as the
 * intended destination of this card, alongside printed_at — nothing here
 * spools anything to it.
 */
function insert_card(
    string $studentId,
    string $lrn,
    ?string $issuedBy,
    ?string $printer = null,
): string {
    // printed_at comes from MySQL's now(), not PHP's clock: issued_on carries
    // a column default, and the two must agree. PHP here runs in UTC while
    // MySQL runs in local time, so a PHP timestamp lands eight hours early.
    $stmt = db()->prepare(
        'insert into id_cards
            (id, student_id, qr_content, issued_by, printer_name, printed_at)
         values (?, ?, ?, ?, ?, if(? is null, null, now()))'
    );

    for ($attempt = 0; ; $attempt++) {
        $id = uuid4();

        try {
            $stmt->execute([
                $id,
                $studentId,
                new_qr_content($lrn),
                $issuedBy,
                $printer,
                $printer,
            ]);

            return $id;
        } catch (PDOException $e) {
            // 65536 codes per LRN, so a clash is rare but not impossible.
            if ($attempt < 4 && duplicate_key($e, 'uq_id_cards_qr')) {
                continue;
            }

            throw $e;
        }
    }
}

/** The student's LRN, or a 404 when the id is unknown. */
function student_lrn(string $studentId): string
{
    $stmt = db()->prepare('select lrn from students where id = ?');
    $stmt->execute([$studentId]);
    $lrn = $stmt->fetchColumn();

    if ($lrn === false) {
        fail(404, 'No student with that id.');
    }

    return (string) $lrn;
}

function route_issue_card(array $user, string $studentId): never
{
    $lrn = student_lrn($studentId);
    $printer = nullable('printer');

    try {
        $id = insert_card($studentId, $lrn, $user['id'], $printer);
    } catch (PDOException $e) {
        if (duplicate_key($e, 'uq_id_cards_one_active_per_student')) {
            fail(409, 'This student already has an active card.');
        }

        throw $e;
    }

    log_action(
        $user['id'],
        'student',
        'issue-id',
        $printer === null ? "LRN $lrn" : "LRN $lrn — printer: $printer",
        'id_card',
        $id,
    );

    send(201, ['id' => $id]);
}

/** Revokes one card by id. Returns false when it was not active to begin with. */
function revoke_card_row(string $cardId, string $reason): bool
{
    $stmt = db()->prepare(
        "update id_cards
            set status = 'revoked', revoked_reason = ?, revoked_at = now()
          where id = ? and status = 'active'"
    );
    $stmt->execute([$reason, $cardId]);

    return $stmt->rowCount() > 0;
}

function route_revoke_card(array $user, string $cardId): never
{
    $reason = field('reason');
    if ($reason === '') {
        fail(422, 'Give a reason for revoking the card.');
    }

    if (!revoke_card_row($cardId, $reason)) {
        $stmt = db()->prepare('select status from id_cards where id = ?');
        $stmt->execute([$cardId]);
        $status = $stmt->fetchColumn();

        fail($status === false ? 404 : 409, $status === false
            ? 'No ID card with that id.'
            : 'That card has already been revoked.');
    }

    log_action($user['id'], 'student', 'revoke-id', $reason, 'id_card', $cardId);

    send(200, ['ok' => true]);
}

/** The student's active card id, or false when they have none. */
function active_card_id(string $studentId): string|false
{
    $stmt = db()->prepare(
        "select id from id_cards
          where student_id = ? and status = 'active' limit 1"
    );
    $stmt->execute([$studentId]);

    return $stmt->fetchColumn();
}

/**
 * Revokes a student's active card without replacing it — the lost-card case
 * where a new ID is not being printed today. Keyed by student rather than by
 * card, so a caller working from a roster never has to look the card up.
 */
function route_revoke_student_card(array $user, string $studentId): never
{
    $reason = field('reason');
    if ($reason === '') {
        fail(422, 'Give a reason for revoking the card.');
    }

    // 404s first if the student does not exist at all.
    $lrn = student_lrn($studentId);
    $cardId = active_card_id($studentId);

    if ($cardId === false) {
        fail(409, 'This student has no active card to revoke.');
    }

    revoke_card_row((string) $cardId, $reason);

    log_action(
        $user['id'],
        'student',
        'revoke-id',
        "LRN $lrn — $reason",
        'id_card',
        (string) $cardId,
    );

    send(200, ['ok' => true]);
}

/**
 * Revokes whatever card is active and issues a replacement. One active card
 * per student is a unique index, so the revoke has to land first — both
 * statements share a transaction to keep the learner from ending up with none.
 */
function route_reissue_card(array $user, string $studentId): never
{
    $reason = field('reason');
    if ($reason === '') {
        fail(422, 'Give a reason for replacing the card.');
    }

    $lrn = student_lrn($studentId);
    $pdo = db();
    $pdo->beginTransaction();

    try {
        $current = active_card_id($studentId);

        if ($current !== false) {
            revoke_card_row((string) $current, $reason);
        }

        $id = insert_card($studentId, $lrn, $user['id'], nullable('printer'));

        log_action(
            $user['id'],
            'student',
            'reissue-id',
            "LRN $lrn — $reason",
            'id_card',
            $id,
        );

        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();

        throw $e;
    }

    send(201, ['id' => $id]);
}
