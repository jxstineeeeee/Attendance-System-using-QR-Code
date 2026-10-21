<?php

declare(strict_types=1);

/**
 * The academic calendar: school years, grade levels, strands and sections.
 *
 * Everything else in the system hangs off these rows — a learner is enrolled
 * into a section, and the section carries the grade and the strand. Two of the
 * rules are the database's and are left there rather than repeated here:
 *
 *   * `trg_sections_bi` / `_bu` refuse a strand on anything but Grades 11-12.
 *   * `uq_sections_year_grade_name` keeps one section name per grade per year.
 *
 * Both surface as SQL errors, and this file turns them into sentences.
 */

/** MySQL SIGNAL from a trigger; the message is already written for a person. */
function trigger_message(PDOException $e): ?string
{
    return ($e->errorInfo[0] ?? '') === '45000'
        ? (string) ($e->errorInfo[2] ?? '')
        : null;
}

function section_rows(int $yearId): array
{
    $stmt = db()->prepare(
        'select sec.id, sec.name, sec.adviser_name,
                g.id as grade_level_id, g.name as grade_level,
                st.id as strand_id, st.code as strand,
                (select count(*) from enrollments e
                   join students s on s.id = e.student_id
                  where e.section_id = sec.id and s.active = 1) as enrolled
           from sections sec
           join grade_levels g on g.id = sec.grade_level_id
           left join strands st on st.id = sec.strand_id
          where sec.school_year_id = ?
          order by g.sort_order, sec.name'
    );
    $stmt->execute([$yearId]);

    return array_map(static fn (array $r): array => [
        'id' => (int) $r['id'],
        'name' => $r['name'],
        'gradeLevel' => $r['grade_level'],
        'gradeLevelId' => (int) $r['grade_level_id'],
        'strand' => $r['strand'],
        'strandId' => $r['strand_id'] === null ? null : (int) $r['strand_id'],
        'adviser' => $r['adviser_name'],
        'enrolled' => (int) $r['enrolled'],
    ], $stmt->fetchAll());
}

function route_academic(): never
{
    $years = db()->query(
        'select id, label, is_active from school_years order by label desc'
    )->fetchAll();

    $active = null;
    foreach ($years as $y) {
        if ($y['is_active']) {
            $active = [
                'id' => (int) $y['id'],
                'label' => $y['label'],
                'isActive' => true,
            ];
        }
    }

    $grades = db()->query(
        'select id, name, is_senior_high from grade_levels order by sort_order'
    )->fetchAll();

    $strands = db()->query('select id, code, name from strands order by code')
        ->fetchAll();

    send(200, [
        'years' => array_map(static fn (array $y): array => [
            'id' => (int) $y['id'],
            'label' => $y['label'],
            'isActive' => (bool) $y['is_active'],
        ], $years),
        'activeYear' => $active,
        'grades' => array_map(static fn (array $g): array => [
            'id' => (int) $g['id'],
            'name' => $g['name'],
            'seniorHigh' => (bool) $g['is_senior_high'],
        ], $grades),
        'strands' => array_map(static fn (array $s): array => [
            'id' => (int) $s['id'],
            'code' => $s['code'],
            'name' => $s['name'],
        ], $strands),
        'sections' => $active === null ? [] : section_rows($active['id']),
    ]);
}

/** Resolves the grade and strand a section form sent, by id. */
function section_inputs(): array
{
    $name = field('name');
    if ($name === '') {
        fail(422, 'Give the section a name.');
    }

    $gradeId = (int) (body()['gradeLevelId'] ?? 0);
    if ($gradeId <= 0) {
        fail(422, 'Choose a grade level.');
    }

    $strandId = body()['strandId'] ?? null;
    $strandId = $strandId === null || $strandId === '' ? null : (int) $strandId;

    return [$name, $gradeId, $strandId, nullable('adviser')];
}

function route_create_section(array $user): never
{
    $year = active_school_year();
    [$name, $gradeId, $strandId, $adviser] = section_inputs();

    try {
        db()->prepare(
            'insert into sections
                (school_year_id, grade_level_id, strand_id, name, adviser_name)
             values (?, ?, ?, ?, ?)'
        )->execute([$year['id'], $gradeId, $strandId, $name, $adviser]);
    } catch (PDOException $e) {
        if ($message = trigger_message($e)) {
            fail(422, $message . '.');
        }
        if (duplicate_key($e, 'uq_sections_year_grade_name')) {
            fail(409, "That grade already has a section called \"$name\".");
        }

        throw $e;
    }

    $id = (int) db()->lastInsertId();
    log_action($user['id'], 'settings', 'add-section', $name, 'section', (string) $id);

    send(201, ['id' => $id]);
}

function route_update_section(array $user, string $rawId): never
{
    $id = (int) $rawId;
    $stmt = db()->prepare('select * from sections where id = ?');
    $stmt->execute([$id]);
    $section = $stmt->fetch();

    if (!$section) {
        fail(404, 'No section with that id.');
    }

    [$name, $gradeId, $strandId, $adviser] = section_inputs();

    try {
        db()->prepare(
            'update sections
                set name = ?, grade_level_id = ?, strand_id = ?, adviser_name = ?
              where id = ?'
        )->execute([$name, $gradeId, $strandId, $adviser, $id]);
    } catch (PDOException $e) {
        if ($message = trigger_message($e)) {
            fail(422, $message . '.');
        }
        if (duplicate_key($e, 'uq_sections_year_grade_name')) {
            fail(409, "That grade already has a section called \"$name\".");
        }

        throw $e;
    }

    log_action($user['id'], 'settings', 'edit-section', $name, 'section', (string) $id);

    send(200, ['ok' => true]);
}

/**
 * Removing a section a learner is enrolled in would orphan the enrolment, and
 * the foreign key says so — but a row count reads better than a constraint.
 */
function route_delete_section(array $user, string $rawId): never
{
    $id = (int) $rawId;
    $stmt = db()->prepare('select name from sections where id = ?');
    $stmt->execute([$id]);
    $name = $stmt->fetchColumn();

    if ($name === false) {
        fail(404, 'No section with that id.');
    }

    $count = db()->prepare('select count(*) from enrollments where section_id = ?');
    $count->execute([$id]);
    $enrolled = (int) $count->fetchColumn();

    if ($enrolled > 0) {
        fail(409, sprintf(
            '%s still has %d learner%s enrolled. Move them to another section '
                . 'first.',
            $name,
            $enrolled,
            $enrolled === 1 ? '' : 's',
        ));
    }

    db()->prepare('delete from sections where id = ?')->execute([$id]);
    log_action($user['id'], 'settings', 'delete-section', (string) $name,
        'section', (string) $id);

    send(200, ['ok' => true]);
}
