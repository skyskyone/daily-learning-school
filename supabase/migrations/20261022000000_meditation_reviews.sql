-- Weekly teacher assessment of each student's meditation practice.
-- Each record represents one Monday-Sunday period. This migration is additive:
-- it does not alter existing student, question, submission, or reflection data.
create table if not exists public.meditation_reviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  week_start date not null,
  rating text not null check (rating in ('長進', '尚可', '不及')),
  comment text not null default '' check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meditation_reviews_student_week_unique unique (student_id, week_start),
  constraint meditation_reviews_week_start_monday check (extract(isodow from week_start) = 1)
);

create index if not exists idx_meditation_reviews_student_week
on public.meditation_reviews (student_id, week_start desc);

create index if not exists idx_meditation_reviews_week
on public.meditation_reviews (week_start desc);

alter table public.meditation_reviews enable row level security;
revoke all on table public.meditation_reviews from anon, authenticated;

-- Refresh the API schema cache after the table has been created.
select pg_notify('pgrst', 'reload schema');
