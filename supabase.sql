create table if not exists public.couple_cal_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.couple_cal_state enable row level security;

drop policy if exists "couple_cal_state_read" on public.couple_cal_state;
drop policy if exists "couple_cal_state_write" on public.couple_cal_state;

create policy "couple_cal_state_read"
on public.couple_cal_state
for select
to anon
using (true);

create policy "couple_cal_state_write"
on public.couple_cal_state
for all
to anon
using (true)
with check (true);
