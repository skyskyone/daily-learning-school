-- Two-week YouTube teaching posts with public student questions/comments and archive history
create table if not exists public.teaching_lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists idx_teaching_lessons_window
on public.teaching_lessons(starts_at desc, ends_at);

create table if not exists public.lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.teaching_lessons(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lesson_comments_lesson_time
on public.lesson_comments(lesson_id, created_at desc);

create index if not exists idx_lesson_comments_student
on public.lesson_comments(student_id, created_at desc);

alter table public.teaching_lessons enable row level security;
alter table public.lesson_comments enable row level security;

revoke all on table public.teaching_lessons from anon, authenticated;
revoke all on table public.lesson_comments from anon, authenticated;
