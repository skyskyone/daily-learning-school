create extension if not exists pgcrypto;

create table if not exists public.settings (
  key text primary key,
  value text not null
);

insert into public.settings(key, value) values
  ('timezone', 'Asia/Taipei'),
  ('publish_time', '08:00'),
  ('close_time', '20:00')
on conflict (key) do nothing;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique,
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question_date date not null unique,
  question_text text not null,
  option1 text not null,
  option2 text not null,
  correct_option smallint not null check (correct_option in (1,2)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  choice smallint not null check (choice in (1,2)),
  submitted_at timestamptz not null default now(),
  unique (student_id, question_id)
);

create table if not exists public.student_login_attempts (
  id bigint generated always as identity primary key,
  student_id uuid references public.students(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_login_attempts_student_time on public.student_login_attempts(student_id, attempted_at desc);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  role text not null check (role in ('student','admin')),
  student_id uuid references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_sessions_expiry on public.sessions(expires_at);
create index if not exists idx_submissions_student_question on public.submissions(student_id, question_id);
create index if not exists idx_questions_date on public.questions(question_date);

alter table public.settings enable row level security;
alter table public.students enable row level security;
alter table public.questions enable row level security;
alter table public.submissions enable row level security;
alter table public.student_login_attempts enable row level security;
alter table public.sessions enable row level security;

revoke all on table public.settings from anon, authenticated;
revoke all on table public.students from anon, authenticated;
revoke all on table public.questions from anon, authenticated;
revoke all on table public.submissions from anon, authenticated;
revoke all on table public.student_login_attempts from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;

create or replace function public.touch_question_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_question_updated_at on public.questions;
create trigger trg_question_updated_at
before update on public.questions
for each row execute function public.touch_question_updated_at();
