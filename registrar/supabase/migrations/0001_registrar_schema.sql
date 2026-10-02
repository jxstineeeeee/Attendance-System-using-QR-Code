-- Registrar backend for the QR Attendance System.
-- Students, their issued ID cards, and the registrar accounts that manage them.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums

create type public.student_sex as enum ('Male', 'Female');

-- Mirrors IdStatus in src/lib/types.ts. Maintained by trigger, never written
-- directly: a student is 'printed' while an active card exists, and drops to
-- 'reissue-needed' once every card has been revoked.
create type public.id_status as enum ('printed', 'not-printed', 'reissue-needed');

create type public.card_status as enum ('active', 'revoked');

-- ---------------------------------------------------------------- registrars

-- One row per staff member who signs in. Keyed to auth.users so Supabase Auth
-- owns the credentials and this table only carries the display profile.
create table public.registrars (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null check (length(btrim(full_name)) > 0),
  role       text not null default 'Registrar',
  created_at timestamptz not null default now()
);

comment on table public.registrars is
  'Profile for a signed-in registrar; credentials live in auth.users.';

-- ---------------------------------------------------------------- students

create table public.students (
  id             uuid primary key default gen_random_uuid(),
  lrn            text not null unique check (lrn ~ '^[0-9]{12}$'),
  last_name      text not null check (length(btrim(last_name)) > 0),
  first_name     text not null check (length(btrim(first_name)) > 0),
  middle_name    text,
  suffix         text,
  sex            public.student_sex,
  grade_level    text not null,
  section        text not null,
  strand         text,
  id_status      public.id_status not null default 'not-printed',
  active         boolean not null default true,
  guardian_name  text not null check (length(btrim(guardian_name)) > 0),
  relationship   text,
  contact_number text not null check (length(btrim(contact_number)) > 0),
  photo_path     text,
  registered_by  uuid references public.registrars (id) on delete set null,
  registered_on  timestamptz not null default now(),
  last_updated   timestamptz not null default now(),

  -- Strand is a senior-high concept; junior high must not carry one.
  constraint students_strand_senior_high_only check (
    strand is null or grade_level in ('Grade 11', 'Grade 12')
  )
);

comment on column public.students.id_status is
  'Derived from id_cards by trigger sync_student_id_status(); do not set directly.';

create index students_last_first_idx on public.students (last_name, first_name);
create index students_grade_section_idx on public.students (grade_level, section);
create index students_id_status_idx on public.students (id_status);

-- ---------------------------------------------------------------- id cards

create table public.id_cards (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.students (id) on delete cascade,
  qr_content     text not null unique,
  status         public.card_status not null default 'active',
  revoked_reason text,
  revoked_at     timestamptz,
  issued_on      timestamptz not null default now(),
  issued_by      uuid references public.registrars (id) on delete set null,

  -- A revocation must carry its timestamp, and an active card must not.
  constraint id_cards_revoked_fields check (
    (status = 'revoked' and revoked_at is not null)
    or (status = 'active' and revoked_at is null and revoked_reason is null)
  )
);

-- The scanner accepts exactly one card per student, so enforce that in the
-- database rather than trusting the app to revoke the old one first.
create unique index id_cards_one_active_per_student
  on public.id_cards (student_id)
  where status = 'active';

create index id_cards_student_issued_idx
  on public.id_cards (student_id, issued_on desc);

-- ---------------------------------------------------------------- triggers

create or replace function public.touch_last_updated()
returns trigger language plpgsql set search_path = public as $fn$
begin
  new.last_updated := now();
  return new;
end;
$fn$;

create trigger students_touch_last_updated
  before update on public.students
  for each row execute function public.touch_last_updated();

-- Recomputes one student's id_status from their card rows.
create or replace function public.recompute_id_status(target uuid)
returns void language sql security definer set search_path = public as $fn$
  update public.students s
     set id_status = case
       when exists (
         select 1 from public.id_cards c
          where c.student_id = target and c.status = 'active'
       ) then 'printed'::public.id_status
       when exists (
         select 1 from public.id_cards c where c.student_id = target
       ) then 'reissue-needed'::public.id_status
       else 'not-printed'::public.id_status
     end
   where s.id = target;
$fn$;

-- Keeps students.id_status in step with the card rows after any insert, update
-- or delete on id_cards. NEW and OLD are read separately rather than coalesced:
-- NEW is unassigned on DELETE, so touching it there would raise.
create or replace function public.sync_student_id_status()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.recompute_id_status(old.student_id);
  end if;

  -- An update that moved the card to another student has to settle both sides.
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.recompute_id_status(new.student_id);
  end if;

  return null;
end;
$fn$;

create trigger id_cards_sync_student_id_status
  after insert or update or delete on public.id_cards
  for each row execute function public.sync_student_id_status();

-- These exist only for the trigger; clients have no reason to call them.
revoke all on function public.recompute_id_status(uuid) from anon, authenticated;
revoke all on function public.sync_student_id_status() from anon, authenticated;

-- ---------------------------------------------------------------- RLS

-- SECURITY DEFINER so the policies on registrars can call it without
-- recursing through their own RLS check.
create or replace function public.is_registrar()
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.registrars r where r.id = auth.uid());
$fn$;

revoke all on function public.is_registrar() from anon;

alter table public.registrars enable row level security;
alter table public.students   enable row level security;
alter table public.id_cards   enable row level security;

-- Registrars can see each other (the profile list backs "registered by" names)
-- but may only edit their own row.
create policy registrars_select on public.registrars
  for select to authenticated using (public.is_registrar());

create policy registrars_update_self on public.registrars
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Student records are staff-only. No policy grants the anon role anything, so
-- the publishable key alone cannot read a single learner row.
create policy students_all on public.students
  for all to authenticated using (public.is_registrar()) with check (public.is_registrar());

create policy id_cards_all on public.id_cards
  for all to authenticated using (public.is_registrar()) with check (public.is_registrar());

-- ---------------------------------------------------------------- photos

insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', false)
on conflict (id) do nothing;

create policy student_photos_read on storage.objects
  for select to authenticated
  using (bucket_id = 'student-photos' and public.is_registrar());

create policy student_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'student-photos' and public.is_registrar());

create policy student_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'student-photos' and public.is_registrar());

create policy student_photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'student-photos' and public.is_registrar());
