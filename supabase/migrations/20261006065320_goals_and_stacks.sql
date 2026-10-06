-- Savings goals and the stacks bought toward them. Money is integer cents.
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  target_cents bigint not null check (target_cents > 0 and target_cents <= 99999999999),
  created_at timestamptz not null default now(),
  cashed_out_at timestamptz
);
create index goals_user_id_idx on public.goals (user_id);

create table public.stacks (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 99999999999),
  created_at timestamptz not null default now()
);
create index stacks_goal_id_idx on public.stacks (goal_id);
create index stacks_user_id_idx on public.stacks (user_id);

alter table public.goals enable row level security;
alter table public.stacks enable row level security;

-- Only signed-in users, and only the operations the app needs.
-- No UPDATE on goals: cashing out goes through cash_out(), which checks the lock.
-- No UPDATE/DELETE on stacks: money in the vault can't be taken back out.
revoke all on public.goals, public.stacks from anon, authenticated;
grant select, insert, delete on public.goals to authenticated;
grant select, insert on public.stacks to authenticated;

create policy "Read own goals" on public.goals
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Create own locked goals" on public.goals
  for insert to authenticated
  with check (user_id = (select auth.uid()) and cashed_out_at is null);

-- A goal holding money can't be deleted (that would sidestep the lock).
create policy "Delete own empty or cashed-out goals" on public.goals
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and (
      cashed_out_at is not null
      or not exists (select 1 from public.stacks s where s.goal_id = goals.id)
    )
  );

create policy "Read own stacks" on public.stacks
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Buy stacks for own open goals" on public.stacks
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.goals g
      where g.id = goal_id
        and g.user_id = (select auth.uid())
        and g.cashed_out_at is null
    )
  );

-- Cash out only once the goal is fully funded.
create function public.cash_out(p_goal_id uuid)
returns public.goals
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.goals;
  saved bigint;
begin
  select * into g
  from public.goals
  where id = p_goal_id and user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'Goal not found.';
  end if;
  if g.cashed_out_at is not null then
    raise exception 'This goal is already cashed out.';
  end if;

  select coalesce(sum(amount_cents), 0) into saved
  from public.stacks
  where goal_id = g.id;

  if saved < g.target_cents then
    raise exception 'Locked: save $% more to cash out.',
      to_char((g.target_cents - saved) / 100.0, 'FM999,999,999,990.00');
  end if;

  update public.goals set cashed_out_at = now() where id = g.id
  returning * into g;
  return g;
end;
$$;

revoke execute on function public.cash_out(uuid) from public, anon;
grant execute on function public.cash_out(uuid) to authenticated;
