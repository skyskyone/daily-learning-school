-- Student-facing update notices and per-student read cursors.
-- Existing students start from migration time so old lessons/reviews are not
-- announced as new; any later updates are notified once per student.
create table if not exists public.school_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  message text not null check (char_length(message) between 1 and 1500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_school_announcements_active_updated
on public.school_announcements (active, updated_at desc);

create table if not exists public.student_notification_state (
  student_id uuid primary key references public.students(id) on delete cascade,
  last_acknowledged_at timestamptz not null default now()
);

-- Do not show pre-existing content as fresh when this feature is first enabled.
insert into public.student_notification_state (student_id, last_acknowledged_at)
select id, now()
from public.students
on conflict (student_id) do nothing;

create or replace function public.initialize_student_notification_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_notification_state (student_id, last_acknowledged_at)
  values (new.id, now())
  on conflict (student_id) do nothing;
  return new;
end;
$$;

revoke all on function public.initialize_student_notification_state() from public, anon, authenticated;

drop trigger if exists trg_initialize_student_notification_state on public.students;
create trigger trg_initialize_student_notification_state
after insert on public.students
for each row execute function public.initialize_student_notification_state();

alter table public.school_announcements enable row level security;
alter table public.student_notification_state enable row level security;
revoke all on table public.school_announcements from anon, authenticated;
revoke all on table public.student_notification_state from anon, authenticated;

select pg_notify('pgrst', 'reload schema');
