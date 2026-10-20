<?php

declare(strict_types=1);

/**
 * The roster the register form has to choose from. Grades, sections and
 * strands are rows in MySQL, not constants in the frontend — a learner can
 * only be enrolled into a section that exists in the active school year.
 */

function route_options(): never
{
    $year = db()->query(
        'select id, label from school_years where is_active = 1 limit 1'
    )->fetch();

    $grades = db()->query(
        'select name, is_senior_high from grade_levels order by sort_order'
    )->fetchAll();

    $strands = db()->query(
        'select code from strands order by code'
    )->fetchAll(PDO::FETCH_COLUMN);

    $sections = [];
    if ($year) {
        $stmt = db()->prepare(
            'select sec.id, sec.name, sec.adviser_name,
                    g.name as grade_level, st.code as strand
               from sections sec
               join grade_levels g on g.id = sec.grade_level_id
               left join strands st on st.id = sec.strand_id
              where sec.school_year_id = ?
              order by g.sort_order, sec.name'
        );
        $stmt->execute([$year['id']]);
        $sections = array_map(static fn (array $r): array => [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'gradeLevel' => $r['grade_level'],
            'strand' => $r['strand'],
            'adviser' => $r['adviser_name'],
        ], $stmt->fetchAll());
    }

    send(200, [
        'schoolYear' => $year ? $year['label'] : null,
        'grades' => array_map(static fn (array $r): array => [
            'name' => $r['name'],
            'seniorHigh' => (bool) $r['is_senior_high'],
        ], $grades),
        'sections' => $sections,
        'strands' => $strands,
    ]);
}
