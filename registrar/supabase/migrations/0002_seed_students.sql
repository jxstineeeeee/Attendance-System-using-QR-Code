-- The eight sample learners that used to live in src/lib/mock.ts, so the
-- students list and profile screens have something to show on a fresh project.
-- registered_by is left null until real registrar accounts exist.

insert into public.students (
  lrn, last_name, first_name, middle_name, suffix, sex,
  grade_level, section, strand,
  guardian_name, relationship, contact_number, registered_on
) values
  ('136743020001', 'Bautista',   'Andrei',  'Lopez',      null,  'Male',   'Grade 7',  'Sampaguita',  null,
   'Marilou Bautista',  'Mother',   '0917 555 0141', '2026-06-03'),
  ('136743020002', 'Cruz',       'Bea',     'Ramos',      null,  'Female', 'Grade 7',  'Narra',       null,
   'Jose Cruz',         'Father',   '0918 555 0192', '2026-06-04'),
  ('136743020003', 'Dela Cruz',  'Carlo',   'Santos',     'Jr.', 'Male',   'Grade 8',  'Molave',      null,
   'Elena Dela Cruz',   'Mother',   '0919 555 0233', '2026-06-04'),
  ('136743020004', 'Espinosa',   'Danica',  'Villanueva', null,  'Female', 'Grade 9',  'Acacia',      null,
   'Teresita Espinosa', 'Guardian', '0920 555 0274', '2026-06-05'),
  ('136743020005', 'Fernandez',  'Elias',   'Reyes',      null,  'Male',   'Grade 10', 'Ilang-Ilang', null,
   'Ramon Fernandez',   'Father',   '0921 555 0315', '2026-06-05'),
  ('136743020006', 'Gonzales',   'Fatima',  'Aquino',     null,  'Female', 'Grade 11', 'Kamagong',    'STEM',
   'Lorna Gonzales',    'Mother',   '0922 555 0356', '2026-06-06'),
  ('136743020007', 'Hernandez',  'Gabriel', 'Mendoza',    null,  'Male',   'Grade 11', 'Narra',       'ABM',
   'Cecilia Hernandez', 'Mother',   '0923 555 0397', '2026-06-06'),
  ('136743020008', 'Ibanez',     'Hannah',  'Torres',     null,  'Female', 'Grade 12', 'Molave',      'HUMSS',
   'Miguel Ibanez',     'Father',   '0924 555 0438', '2026-06-07')
on conflict (lrn) do nothing;

-- Cards are matched to students by LRN. Inserting these drives the
-- sync_student_id_status trigger, which is what sets each student's id_status:
-- an active card gives 'printed', only-revoked cards give 'reissue-needed',
-- and the students with no card row stay 'not-printed'.
insert into public.id_cards (student_id, qr_content, status, issued_on, revoked_at, revoked_reason)
select s.id, v.qr_content, v.status::public.card_status, v.issued_on, v.revoked_at, v.revoked_reason
  from (values
    ('136743020001', '136743020001-A7F2', 'active',  '2026-06-03'::timestamptz, null::timestamptz, null),
    ('136743020003', '136743020003-C1B9', 'active',  '2026-07-12'::timestamptz, null::timestamptz, null),
    ('136743020003', '136743020003-B4E1', 'revoked', '2026-06-04'::timestamptz, '2026-07-12'::timestamptz, 'Lost'),
    ('136743020005', '136743020005-D8A3', 'active',  '2026-06-05'::timestamptz, null::timestamptz, null),
    ('136743020006', '136743020006-E2C7', 'revoked', '2026-06-06'::timestamptz, '2026-09-02'::timestamptz, 'Lost'),
    ('136743020007', '136743020007-F5D0', 'active',  '2026-06-06'::timestamptz, null::timestamptz, null)
  ) as v (lrn, qr_content, status, issued_on, revoked_at, revoked_reason)
  join public.students s on s.lrn = v.lrn
on conflict (qr_content) do nothing;
