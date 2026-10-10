-- 每月奮鬥榜封存：月份結束後保留當時排名，不因往後改題而重新計算
create table if not exists public.monthly_leaderboard_archives (
  month text primary key check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  month_label text not null,
  question_count integer not null default 0 check (question_count >= 0),
  settled_at timestamptz not null default now()
);

create table if not exists public.monthly_leaderboard_rows (
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  student_id uuid not null,
  display_name text not null,
  rank integer not null check (rank >= 1),
  correct_count integer not null default 0 check (correct_count >= 0),
  answered_count integer not null default 0 check (answered_count >= 0),
  total_questions integer not null default 0 check (total_questions >= 0),
  accuracy numeric(5,1) not null default 0,
  primary key (month, student_id)
);

create index if not exists idx_monthly_leaderboard_rows_month_rank
on public.monthly_leaderboard_rows(month, rank);

alter table public.monthly_leaderboard_archives enable row level security;
alter table public.monthly_leaderboard_rows enable row level security;

revoke all on table public.monthly_leaderboard_archives from anon, authenticated;
revoke all on table public.monthly_leaderboard_rows from anon, authenticated;
