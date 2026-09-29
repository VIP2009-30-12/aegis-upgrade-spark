-- lovable-cron-fallback-reviewed: brief requires ~1/min server-side detection of missed check-ins while the app is closed; time-based, no row event exists at the deadline
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;

-- ===== Safety Circle =====
create table public.circle_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  member_id uuid references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  relationship text not null default '' check (char_length(relationship) <= 40),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  expires_at timestamptz not null default now() + interval '72 hours',
  perm_walk boolean not null default true,
  perm_checkins boolean not null default true,
  perm_alerts boolean not null default true,
  perm_location boolean not null default false,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.circle_members to authenticated;
grant all on public.circle_members to service_role;
alter table public.circle_members enable row level security;
create policy "Owner reads circle" on public.circle_members for select to authenticated using (owner_id = auth.uid());
create policy "Owner creates invite" on public.circle_members for insert to authenticated
  with check (owner_id = auth.uid() and member_id is null and status = 'pending');
create policy "Owner updates circle" on public.circle_members for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owner deletes circle" on public.circle_members for delete to authenticated using (owner_id = auth.uid());

create or replace function public.circle_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() = old.owner_id then
    if new.member_id is distinct from old.member_id then raise exception 'owner cannot set member'; end if;
    if new.status = 'accepted' and old.status <> 'accepted' then raise exception 'owner cannot accept'; end if;
    if old.status = 'revoked' and new.status <> 'revoked' then raise exception 'revoked is final'; end if;
    if new.token_hash <> old.token_hash then raise exception 'token immutable'; end if;
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger circle_guard before update on public.circle_members for each row execute function public.circle_guard();

-- ===== Walks =====
create table public.walks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('walk','journey')),
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  interval_min int check (interval_min between 1 and 240),
  grace_min int not null default 5 check (grace_min between 0 and 60),
  next_checkin_at timestamptz,
  last_checkin_at timestamptz,
  escalated_for timestamptz,
  destination text check (char_length(destination) <= 120),
  eta text check (char_length(eta) <= 10),
  share_location boolean not null default false,
  loc_lat double precision, loc_lng double precision, loc_acc int, loc_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index walks_one_active on public.walks(user_id) where status = 'active';
grant select, insert, update, delete on public.walks to authenticated;
grant all on public.walks to service_role;
alter table public.walks enable row level security;
create policy "Own walks" on public.walks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.walk_minimise() returns trigger language plpgsql set search_path = public as $$
begin
  if new.status <> 'active' or not new.share_location then
    new.loc_lat := null; new.loc_lng := null; new.loc_acc := null; new.loc_at := null;
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger walk_minimise before insert or update on public.walks for each row execute function public.walk_minimise();

create table public.check_ins (
  id uuid primary key,
  walk_id uuid not null references public.walks(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  at timestamptz not null default now()
);
grant select, insert, delete on public.check_ins to authenticated;
grant all on public.check_ins to service_role;
alter table public.check_ins enable row level security;
create policy "Own check-ins read" on public.check_ins for select to authenticated using (user_id = auth.uid());
create policy "Own check-ins add" on public.check_ins for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.walks w where w.id = walk_id and w.user_id = auth.uid()));
create policy "Own check-ins delete" on public.check_ins for delete to authenticated using (user_id = auth.uid());

-- ===== Alerts =====
create table public.walk_alerts (
  id uuid primary key default gen_random_uuid(),
  walk_id uuid not null references public.walks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references public.circle_members(id) on delete cascade,
  kind text not null default 'missed_checkin',
  due_at timestamptz not null,
  status text not null default 'simulated' check (status in ('created','simulated','sent','delivered','failed','acknowledged')),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  unique (walk_id, due_at, member_id)
);
grant select, delete on public.walk_alerts to authenticated;
grant all on public.walk_alerts to service_role;
alter table public.walk_alerts enable row level security;
create policy "Owner reads alerts" on public.walk_alerts for select to authenticated using (user_id = auth.uid());
create policy "Owner deletes alerts" on public.walk_alerts for delete to authenticated using (user_id = auth.uid());

-- ===== Server functions =====
create or replace function public.escalate_overdue() returns int language plpgsql security definer set search_path = public as $$
declare n int := 0;
begin
  with due as (
    select w.id, w.user_id, w.next_checkin_at from public.walks w
    where w.status = 'active' and w.next_checkin_at is not null
      and now() >= w.next_checkin_at + make_interval(mins => w.grace_min)
      and w.escalated_for is distinct from w.next_checkin_at
    for update skip locked
  ), ins as (
    insert into public.walk_alerts (walk_id, user_id, member_id, due_at)
    select d.id, d.user_id, m.id, d.next_checkin_at from due d
    join public.circle_members m on m.owner_id = d.user_id and m.status = 'accepted' and m.perm_alerts
    on conflict do nothing returning 1
  ), upd as (
    update public.walks w set escalated_for = d.next_checkin_at from due d where w.id = d.id returning 1
  )
  select (select count(*) from ins) into n;
  return n;
end $$;
revoke execute on function public.escalate_overdue() from public, anon, authenticated;

create or replace function public.accept_invite(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.circle_members; nm text;
begin
  if auth.uid() is null then return jsonb_build_object('result','signin'); end if;
  select * into r from public.circle_members where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if not found then return jsonb_build_object('result','invalid'); end if;
  select display_name into nm from public.profiles where id = r.owner_id;
  if r.status = 'revoked' then return jsonb_build_object('result','revoked'); end if;
  if r.status = 'accepted' then return jsonb_build_object('result', case when r.member_id = auth.uid() then 'already' else 'used' end, 'owner', nm); end if;
  if r.expires_at < now() then return jsonb_build_object('result','expired'); end if;
  if r.owner_id = auth.uid() then return jsonb_build_object('result','own'); end if;
  update public.circle_members set member_id = auth.uid(), status = 'accepted', accepted_at = now() where id = r.id;
  return jsonb_build_object('result','accepted','owner', nm);
end $$;
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

create or replace function public.guardian_overview() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'circle_id', m.id,
    'owner_name', p.display_name,
    'perms', jsonb_build_object('walk', m.perm_walk, 'checkins', m.perm_checkins, 'alerts', m.perm_alerts, 'location', m.perm_location),
    'walk', case when m.perm_walk then (
      select jsonb_build_object(
        'type', w.type, 'started_at', w.started_at, 'destination', w.destination, 'eta', w.eta, 'grace_min', w.grace_min,
        'next_checkin_at', case when m.perm_checkins then w.next_checkin_at end,
        'last_checkin_at', case when m.perm_checkins then w.last_checkin_at end,
        'overdue', (w.next_checkin_at is not null and now() > w.next_checkin_at + make_interval(mins => w.grace_min)),
        'location', case when m.perm_location and w.share_location and w.loc_lat is not null
          then jsonb_build_object('lat', w.loc_lat, 'lng', w.loc_lng, 'acc', w.loc_acc, 'at', w.loc_at) end)
      from public.walks w where w.user_id = m.owner_id and w.status = 'active' limit 1) end,
    'alerts', case when m.perm_alerts then (
      select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'due_at', a.due_at, 'status', a.status, 'created_at', a.created_at, 'acknowledged_at', a.acknowledged_at) order by a.created_at desc), '[]'::jsonb)
      from (select * from public.walk_alerts x where x.member_id = m.id order by x.created_at desc limit 10) a) end
  )), '[]'::jsonb)
  from public.circle_members m left join public.profiles p on p.id = m.owner_id
  where m.member_id = auth.uid() and m.status = 'accepted';
$$;
revoke execute on function public.guardian_overview() from public, anon;
grant execute on function public.guardian_overview() to authenticated;

create or replace function public.ack_alert(p_id uuid) returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.walk_alerts a set status = 'acknowledged', acknowledged_at = now()
  where a.id = p_id and a.status <> 'acknowledged'
    and a.member_id in (select id from public.circle_members where member_id = auth.uid() and status = 'accepted' and perm_alerts);
  return found;
end $$;
revoke execute on function public.ack_alert(uuid) from public, anon;
grant execute on function public.ack_alert(uuid) to authenticated;

create or replace function public.leave_circle(p_id uuid) returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.circle_members set status = 'revoked' where id = p_id and member_id = auth.uid();
  return found;
end $$;
revoke execute on function public.leave_circle(uuid) from public, anon;
grant execute on function public.leave_circle(uuid) to authenticated;

select cron.schedule('aegis-escalate-overdue', '* * * * *', $$select public.escalate_overdue()$$);