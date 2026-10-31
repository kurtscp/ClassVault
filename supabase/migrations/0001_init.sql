-- ClassVault 0001_init.sql (v2.0 — expanded)
-- Run once in the Supabase SQL Editor.
-- Tables: profiles, courses, enrollments, materials, comments, submissions, material_views
-- Buckets: lms-files (80 MB), submission-files (80 MB)

-- Disable function body checking during creation to handle mutual circular dependency
-- between generate_join_code() and courses table.
set check_function_bodies = off;

-- ============================================================
-- 1. ENUMS
-- ============================================================
create type public.user_role as enum ('instructor', 'student');
create type public.material_type as enum ('presentation', 'exercise');

-- ============================================================
-- 2. TABLES
-- ============================================================

-- 2a. Profiles
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  role        public.user_role not null default 'student',
  created_at  timestamptz not null default now()
);

-- 2b. Join-code generator (used as default for courses.join_code)
create or replace function public.generate_join_code()
returns text
language plpgsql
as $$
declare
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I to avoid confusion
  code   text := '';
  i      int;
  done   bool := false;
begin
  while not done loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    done := not exists (select 1 from public.courses where join_code = code);
  end loop;
  return code;
end;
$$;

-- 2c. Courses
create table public.courses (
  id             uuid primary key default gen_random_uuid(),
  code           text not null check (char_length(code) between 2 and 12),
  title          text not null check (char_length(title) between 3 and 80),
  description    text check (char_length(description) <= 280),
  instructor_id  uuid not null references public.profiles (id) on delete cascade,
  join_code      text not null unique default public.generate_join_code(),
  created_at     timestamptz not null default now(),
  unique (instructor_id, code)
);

-- 2d. Enrollments
create table public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (course_id, student_id)
);

-- 2e. Materials
create table public.materials (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses (id) on delete cascade,
  uploader_id  uuid not null references public.profiles (id) on delete cascade,
  title        text not null check (char_length(title) between 3 and 80),
  type         public.material_type not null,
  file_path    text not null,
  file_name    text not null,
  mime_type    text not null,
  size_bytes   bigint not null check (size_bytes > 0 and size_bytes <= 83886080),
  created_at   timestamptz not null default now()
);

-- 2f. Comments
create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  material_id  uuid not null references public.materials (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  content      text not null check (char_length(content) between 1 and 500),
  created_at   timestamptz not null default now()
);

-- 2g. Submissions (student exercise submissions with optional grade)
create table public.submissions (
  id           uuid primary key default gen_random_uuid(),
  material_id  uuid not null references public.materials (id) on delete cascade,
  student_id   uuid not null references public.profiles (id) on delete cascade,
  file_path    text not null,
  file_name    text not null,
  mime_type    text not null,
  size_bytes   bigint not null check (size_bytes > 0 and size_bytes <= 83886080),
  grade        numeric(5,2) check (grade >= 0 and grade <= 100),
  graded_by    uuid references public.profiles (id),
  graded_at    timestamptz,
  created_at   timestamptz not null default now(),
  unique (material_id, student_id)
);

-- 2h. Material views (analytics tracking)
create table public.material_views (
  id           uuid primary key default gen_random_uuid(),
  material_id  uuid not null references public.materials (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  viewed_at    timestamptz not null default now()
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
create index courses_instructor_idx on public.courses (instructor_id);
create index enrollments_student_idx on public.enrollments (student_id, course_id);
create index enrollments_course_idx on public.enrollments (course_id);
create index materials_course_idx on public.materials (course_id, type, created_at desc);
create index comments_material_idx on public.comments (material_id, created_at asc);
create index submissions_material_idx on public.submissions (material_id);
create index submissions_student_idx on public.submissions (student_id, material_id);
create index material_views_material_idx on public.material_views (material_id);
create index material_views_user_idx on public.material_views (user_id, material_id);

-- ============================================================
-- 4. FUNCTIONS AND TRIGGERS
-- ============================================================

-- 4a. Auto-create a profile at sign-up (reads full_name and role from sign-up metadata)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'student')::public.user_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4b. Helper: is the current user an instructor?
create or replace function public.is_instructor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'instructor'
  );
$$;

-- 4c. Helper: is the current user enrolled in this course (or the instructor)?
create or replace function public.is_enrolled(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.courses c
    where c.id = p_course_id and c.instructor_id = (select auth.uid())
  )
  or exists (
    select 1 from public.enrollments e
    where e.course_id = p_course_id and e.student_id = (select auth.uid())
  );
$$;

-- 4d. Enrollment RPC: enroll a student using a join code
create or replace function public.enroll_with_code(p_join_code text)
returns uuid  -- returns the course_id
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_id uuid;
  v_user_id   uuid;
  v_role      public.user_role;
begin
  v_user_id := (select auth.uid());

  -- Verify caller is a student
  select role into v_role from public.profiles where id = v_user_id;
  if v_role is null or v_role != 'student' then
    raise exception 'Only students can enroll in courses.';
  end if;

  -- Look up the course by join code (case-insensitive)
  select id into v_course_id
  from public.courses
  where join_code = upper(trim(p_join_code));

  if v_course_id is null then
    raise exception 'No course found with this code. Check the code and try again.';
  end if;

  -- Insert enrollment (idempotent: ignore if already enrolled)
  insert into public.enrollments (course_id, student_id)
  values (v_course_id, v_user_id)
  on conflict (course_id, student_id) do nothing;

  return v_course_id;
end;
$$;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.courses        enable row level security;
alter table public.enrollments    enable row level security;
alter table public.materials      enable row level security;
alter table public.comments       enable row level security;
alter table public.submissions    enable row level security;
alter table public.material_views enable row level security;

-- ----- PROFILES -----
-- Readable by signed-in users; no client-side writes (trigger only)
create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated using (true);

-- ----- COURSES -----
-- Instructors see their own courses; students see enrolled courses
create policy "courses_select_enrolled_or_owner"
  on public.courses for select to authenticated
  using (
    instructor_id = (select auth.uid())
    or exists (
      select 1 from public.enrollments e
      where e.course_id = id and e.student_id = (select auth.uid())
    )
  );

create policy "courses_insert_instructor"
  on public.courses for insert to authenticated
  with check (instructor_id = (select auth.uid()) and public.is_instructor());

create policy "courses_update_owner"
  on public.courses for update to authenticated
  using (instructor_id = (select auth.uid()))
  with check (instructor_id = (select auth.uid()));

create policy "courses_delete_owner"
  on public.courses for delete to authenticated
  using (instructor_id = (select auth.uid()));

-- ----- ENROLLMENTS -----
-- No INSERT policy: enrollment happens via enroll_with_code() SECURITY DEFINER function
-- SELECT: the enrolled student or the course instructor
create policy "enrollments_select_participant"
  on public.enrollments for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.courses c
      where c.id = course_id and c.instructor_id = (select auth.uid())
    )
  );

-- DELETE: student can unenroll, or instructor can remove a student
create policy "enrollments_delete_participant"
  on public.enrollments for delete to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.courses c
      where c.id = course_id and c.instructor_id = (select auth.uid())
    )
  );

-- ----- MATERIALS -----
-- Readable by course owner or enrolled students
create policy "materials_select_enrolled_or_owner"
  on public.materials for select to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_id
      and (
        c.instructor_id = (select auth.uid())
        or exists (
          select 1 from public.enrollments e
          where e.course_id = c.id and e.student_id = (select auth.uid())
        )
      )
    )
  );

create policy "materials_insert_course_owner"
  on public.materials for insert to authenticated
  with check (
    uploader_id = (select auth.uid())
    and public.is_instructor()
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.instructor_id = (select auth.uid())
    )
  );

create policy "materials_delete_course_owner"
  on public.materials for delete to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_id and c.instructor_id = (select auth.uid())
    )
  );

-- ----- COMMENTS -----
-- Readable by enrolled users or course owner
create policy "comments_select_enrolled"
  on public.comments for select to authenticated
  using (
    exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id
      and (
        c.instructor_id = (select auth.uid())
        or exists (
          select 1 from public.enrollments e
          where e.course_id = c.id and e.student_id = (select auth.uid())
        )
      )
    )
  );

-- Insert: enrolled user or course owner, as themselves
create policy "comments_insert_enrolled"
  on public.comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id
      and (
        c.instructor_id = (select auth.uid())
        or exists (
          select 1 from public.enrollments e
          where e.course_id = c.id and e.student_id = (select auth.uid())
        )
      )
    )
  );

-- Delete: comment author or course instructor
create policy "comments_delete_author_or_instructor"
  on public.comments for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id and c.instructor_id = (select auth.uid())
    )
  );

-- ----- SUBMISSIONS -----
-- Insert: enrolled students, for exercises only, as themselves
create policy "submissions_insert_enrolled_student"
  on public.submissions for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id
      and m.type = 'exercise'
      and exists (
        select 1 from public.enrollments e
        where e.course_id = c.id and e.student_id = (select auth.uid())
      )
    )
  );

-- Select: own submissions or course instructor
create policy "submissions_select_own_or_instructor"
  on public.submissions for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id and c.instructor_id = (select auth.uid())
    )
  );

-- Update: course instructor only (for grading)
create policy "submissions_update_grade_instructor"
  on public.submissions for update to authenticated
  using (
    exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id and c.instructor_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id and c.instructor_id = (select auth.uid())
    )
  );

-- Delete: student can delete their own submission (for resubmission cleanup)
create policy "submissions_delete_own"
  on public.submissions for delete to authenticated
  using (student_id = (select auth.uid()));

-- ----- MATERIAL VIEWS -----
-- Insert: enrolled user or course owner, as themselves
create policy "material_views_insert_enrolled"
  on public.material_views for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id
      and (
        c.instructor_id = (select auth.uid())
        or exists (
          select 1 from public.enrollments e
          where e.course_id = c.id and e.student_id = (select auth.uid())
        )
      )
    )
  );

-- Select: own views or course instructor (for analytics)
create policy "material_views_select_own_or_instructor"
  on public.material_views for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.materials m
      join public.courses c on c.id = m.course_id
      where m.id = material_id and c.instructor_id = (select auth.uid())
    )
  );

-- ============================================================
-- 6. STORAGE: private buckets, 80 MB, PDF / PPT / PPTX only
-- ============================================================

-- 6a. Materials bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lms-files', 'lms-files', false, 83886080,
  array[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do nothing;

-- 6b. Submissions bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submission-files', 'submission-files', false, 83886080,
  array[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do nothing;

-- ----- LMS-FILES STORAGE POLICIES -----
-- Read: course owner or enrolled students
create policy "lms_files_select_enrolled_or_owner"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lms-files'
    and (
      exists (
        select 1 from public.courses c
        where c.id::text = (storage.foldername(name))[1]
          and c.instructor_id = (select auth.uid())
      )
      or exists (
        select 1 from public.courses c
        join public.enrollments e on e.course_id = c.id
        where c.id::text = (storage.foldername(name))[1]
          and e.student_id = (select auth.uid())
      )
    )
  );

-- Insert: course owner only
create policy "lms_files_insert_course_owner"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lms-files'
    and exists (
      select 1 from public.courses c
      where c.id::text = (storage.foldername(name))[1]
        and c.instructor_id = (select auth.uid())
    )
  );

-- Delete: course owner only
create policy "lms_files_delete_course_owner"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'lms-files'
    and exists (
      select 1 from public.courses c
      where c.id::text = (storage.foldername(name))[1]
        and c.instructor_id = (select auth.uid())
    )
  );

-- ----- SUBMISSION-FILES STORAGE POLICIES -----
-- Storage path structure: <course_id>/<student_id>/<filename>

-- Read: course instructor or submitting student (own folder only)
create policy "submission_files_select_enrolled_or_owner"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'submission-files'
    and (
      -- Course instructor can view all submissions in their course
      exists (
        select 1 from public.courses c
        where c.id::text = (storage.foldername(name))[1]
          and c.instructor_id = (select auth.uid())
      )
      -- Student can only view their own submission files
      or (
        (storage.foldername(name))[2] = (select auth.uid())::text
        and exists (
          select 1 from public.courses c
          join public.enrollments e on e.course_id = c.id
          where c.id::text = (storage.foldername(name))[1]
            and e.student_id = (select auth.uid())
        )
      )
    )
  );

-- Insert: enrolled students only, into their own student_id folder
create policy "submission_files_insert_enrolled_student"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submission-files'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and exists (
      select 1 from public.courses c
      join public.enrollments e on e.course_id = c.id
      where c.id::text = (storage.foldername(name))[1]
        and e.student_id = (select auth.uid())
    )
  );

-- Delete: submitting student (own folder only) or course instructor
create policy "submission_files_delete_own_or_instructor"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'submission-files'
    and (
      -- Course instructor can delete submissions in their course
      exists (
        select 1 from public.courses c
        where c.id::text = (storage.foldername(name))[1]
          and c.instructor_id = (select auth.uid())
      )
      -- Submitting student can delete only their own submission files
      or (
        (storage.foldername(name))[2] = (select auth.uid())::text
        and exists (
          select 1 from public.courses c
          join public.enrollments e on e.course_id = c.id
          where c.id::text = (storage.foldername(name))[1]
            and e.student_id = (select auth.uid())
        )
      )
    )
  );
