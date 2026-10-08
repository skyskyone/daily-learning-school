-- 心得區：管理員留言、學生十項目標、學生問題與管理員解答
create table if not exists public.student_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  note_type text not null check (note_type in ('tianyan','ganying')),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_notes_student_type_time
on public.student_notes(student_id, note_type, created_at desc);

create table if not exists public.student_goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  slot smallint not null check (slot between 1 and 10),
  answer_text text not null default '',
  first_answered_at timestamptz,
  updated_at timestamptz not null default now(),
  edit_count smallint not null default 0 check (edit_count between 0 and 2),
  updated_by text not null default 'student' check (updated_by in ('student','admin')),
  unique(student_id, slot)
);

create index if not exists idx_student_goals_student_slot
on public.student_goals(student_id, slot);

create table if not exists public.student_questions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  question_text text not null,
  admin_answer text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  answered_at timestamptz
);

create index if not exists idx_student_questions_student_time
on public.student_questions(student_id, created_at desc);

alter table public.student_notes enable row level security;
alter table public.student_goals enable row level security;
alter table public.student_questions enable row level security;

revoke all on table public.student_notes from anon, authenticated;
revoke all on table public.student_goals from anon, authenticated;
revoke all on table public.student_questions from anon, authenticated;

create or replace function public.touch_student_reflection_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_student_notes_updated_at on public.student_notes;
create trigger trg_student_notes_updated_at
before update on public.student_notes
for each row execute function public.touch_student_reflection_updated_at();

drop trigger if exists trg_student_questions_updated_at on public.student_questions;
create trigger trg_student_questions_updated_at
before update on public.student_questions
for each row execute function public.touch_student_reflection_updated_at();
