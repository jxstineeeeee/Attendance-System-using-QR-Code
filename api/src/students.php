<?php

declare(strict_types=1);

/**
 * The students endpoints. Reads go through the `v_students` view, which has
 * already resolved the learner's section, grade and strand for the active
 * school year; writes touch `students` and `enrollments` together.
 */

const STUDENT_PAGE_MAX = 100;

function student_json(array $r): array
{
    return [
        'id' => $r['id'],
        'lrn' => $r['lrn'],
        'lastName' => $r['last_name'],
        'firstName' => $r['first_name'],
        'middleName' => $r['middle_name'],
        'suffix' => $r['suffix'],
        'sex' => $r['sex'],
        // Empty when the learner has no enrolment in the active school year.
        'gradeLevel' => $r['grade_level'] ?? '',
        'section' => $r['section'] ?? '',
        'strand' => $r['strand'],
        'idStatus' => $r['id_status'],
        'active' => (bool) $r['active'],
        'guardianName' => $r['guardian_name'],
        'relationship' => $r['relationship'],
        'contactNumber' => $r['contact_number'],
        'photoPath' => $r['photo_path'],
        'registeredOn' => iso($r['registered_on']),
        'lastUpdated' => iso($r['last_updated']),
        'registeredByName' => $r['registered_by_name'],
        'cards' => [],
    ];
}

/** Escapes the wildcards, so a search for "100%" is not a search for anything. */
function like_term(string $term): string
{
    return '%' . str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $term) . '%';
}

/** Builds the WHERE clause shared by the list and its count. */
function student_filters(): array
{
    $where = [];
    $params = [];

    $query = param('query');
    if ($query !== '') {
        // One placeholder per column: a named parameter cannot be reused in a
        // real prepared statement, only in an emulated one.
        $where[] = '(lrn like :q1 or last_name like :q2 or first_name like :q3'
            . " or concat(first_name, ' ', last_name) like :q4)";
        $term = like_term($query);
        $params += [':q1' => $term, ':q2' => $term, ':q3' => $term, ':q4' => $term];
    }

    $columns = [
        'grade' => 'grade_level',
        'section' => 'section',
        'status' => 'id_status',
    ];
    foreach ($columns as $name => $column) {
        $value = param($name);
        if ($value !== '') {
            $where[] = "$column = :$name";
            $params[":$name"] = $value;
        }
    }

    return [$where ? 'where ' . implode(' and ', $where) : '', $params];
}

function route_list_students(): never
{
    [$where, $params] = student_filters();

    $count = db()->prepare("select count(*) from v_students $where");
    $count->execute($params);
    $total = (int) $count->fetchColumn();

    // Cast rather than bind: LIMIT/OFFSET placeholders arrive as strings with
    // emulated prepares off, which MySQL rejects.
    $pageSize = max(1, min(STUDENT_PAGE_MAX, (int) param('pageSize', '8')));
    $page = max(0, (int) param('page', '0'));
    $offset = $page * $pageSize;

    $stmt = db()->prepare(
        "select * from v_students $where
          order by last_name, first_name
          limit $pageSize offset $offset"
    );
    $stmt->execute($params);

    send(200, [
        'rows' => array_map('student_json', $stmt->fetchAll()),
        'total' => $total,
    ]);
}

function route_get_student(string $id): never
{
    $stmt = db()->prepare('select * from v_students where id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    if (!$row) {
        fail(404, 'No student with that id.');
    }

    $student = student_json($row);
    $student['cards'] = cards_for_student($id);

    send(200, ['student' => $student]);
}

function route_lrn_taken(): never
{
    $lrn = param('lrn');
    if ($lrn === '') {
        fail(400, 'Pass the lrn to check.');
    }

    $stmt = db()->prepare('select 1 from students where lrn = ?');
    $stmt->execute([$lrn]);

    send(200, ['taken' => (bool) $stmt->fetchColumn()]);
}

/** The school year everything new is filed under. */
function active_school_year(): array
{
    $row = db()->query(
        'select id, label from school_years where is_active = 1 limit 1'
    )->fetch();

    if (!$row) {
        fail(409, 'No school year is marked active, so a learner cannot be '
            . 'enrolled. Set one in the admin console.');
    }

    return $row;
}

/**
 * Resolves the form's grade and section names to the one section row they can
 * mean in the active school year. That row also carries the strand, so the
 * roster decides it rather than the form.
 */
function resolve_section(int $yearId, string $grade, string $section): array
{
    $stmt = db()->prepare(
        'select sec.id, sec.name, g.name as grade_level, st.code as strand
           from sections sec
           join grade_levels g on g.id = sec.grade_level_id
           left join strands st on st.id = sec.strand_id
          where sec.school_year_id = ? and g.name = ? and sec.name = ?'
    );
    $stmt->execute([$yearId, $grade, $section]);
    $row = $stmt->fetch();

    if (!$row) {
        fail(422, sprintf(
            'There is no "%s" section under %s in this school year.',
            $section,
            $grade,
        ));
    }

    return $row;
}

function route_create_student(array $user): never
{
    $lrn = field('lrn');
    if (!preg_match('/^\d{12}$/', $lrn)) {
        fail(422, 'The LRN must be exactly 12 digits.');
    }

    $required = [
        'lastName' => 'Last name',
        'firstName' => 'First name',
        'gradeLevel' => 'Grade level',
        'section' => 'Section',
        'guardianName' => 'Parent / guardian name',
        'contactNumber' => 'Contact number',
    ];
    foreach ($required as $key => $label) {
        if (field($key) === '') {
            fail(422, "$label is required.");
        }
    }

    $sex = field('sex');
    if (!in_array($sex, ['Male', 'Female', ''], true)) {
        fail(422, 'Sex must be Male, Female, or left blank.');
    }

    $issueCard = (bool) (body()['issueCard'] ?? true);
    $pdo = db();
    $pdo->beginTransaction();

    try {
        $year = active_school_year();
        $section = resolve_section(
            (int) $year['id'],
            field('gradeLevel'),
            field('section'),
        );

        $id = uuid4();
        $pdo->prepare(
            'insert into students
                (id, lrn, last_name, first_name, middle_name, suffix, sex,
                 guardian_name, relationship, contact_number, registered_by)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $id,
            $lrn,
            field('lastName'),
            field('firstName'),
            nullable('middleName'),
            nullable('suffix'),
            $sex === '' ? null : $sex,
            field('guardianName'),
            nullable('relationship'),
            field('contactNumber'),
            $user['id'],
        ]);

        $pdo->prepare(
            'insert into enrollments (student_id, school_year_id, section_id)
             values (?, ?, ?)'
        )->execute([$id, $year['id'], $section['id']]);

        if ($issueCard) {
            insert_card($id, $lrn, $user['id'], nullable('printer'));
        }

        log_action(
            $user['id'],
            'student',
            'register',
            sprintf(
                '%s, %s (LRN %s) into %s - %s',
                field('lastName'),
                field('firstName'),
                $lrn,
                $section['grade_level'],
                $section['name'],
            ),
            'student',
            $id,
        );

        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();

        if (duplicate_key($e, 'uq_students_lrn')) {
            fail(409, 'That LRN is already registered.');
        }

        throw $e;
    }

    send(201, ['id' => $id]);
}

function route_set_student_active(array $user, string $id): never
{
    $active = body()['active'] ?? null;
    if (!is_bool($active)) {
        fail(400, 'Send { "active": true } or { "active": false }.');
    }

    $stmt = db()->prepare('update students set active = ? where id = ?');
    $stmt->execute([$active ? 1 : 0, $id]);

    // rowCount is 0 both for an unknown id and for a value that already
    // matched, so check which one happened before reporting success.
    if ($stmt->rowCount() === 0) {
        $exists = db()->prepare('select 1 from students where id = ?');
        $exists->execute([$id]);
        if (!$exists->fetchColumn()) {
            fail(404, 'No student with that id.');
        }
    }

    log_action(
        $user['id'],
        'student',
        $active ? 'reactivate' : 'deactivate',
        null,
        'student',
        $id,
    );

    send(200, ['ok' => true]);
}
