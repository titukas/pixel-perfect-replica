create extension if not exists pgcrypto with schema extensions;

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  gender text not null default 'prefer_not_to_say' check (gender in ('male','female','non_binary','prefer_not_to_say')),
  avatar_url text,
  notify_prefs jsonb not null default '{"chores":true,"rewards":true,"points":true}'::jsonb,
  video_verification_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.terms_acceptance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now()
);
grant select on public.terms_acceptance to authenticated;
grant all on public.terms_acceptance to service_role;
alter table public.terms_acceptance enable row level security;
create policy "own terms" on public.terms_acceptance for select to authenticated using (user_id = auth.uid());

-- HOUSEHOLDS
create table public.households (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  created_at timestamptz not null default now()
);
create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null unique,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
grant select on public.households, public.household_members to authenticated;
grant all on public.households, public.household_members to service_role;
alter table public.households enable row level security;
alter table public.household_members enable row level security;

create or replace function public.my_household_id() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from public.household_members where user_id = auth.uid()
$$;
create or replace function public.is_household_member(_hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members where household_id = _hid and user_id = auth.uid())
$$;

create policy "members read household" on public.households for select to authenticated using (public.is_household_member(id));
create policy "members read members" on public.household_members for select to authenticated using (public.is_household_member(household_id));
create policy "read own or partner profile" on public.profiles for select to authenticated
  using (id = auth.uid() or exists (select 1 from public.household_members m where m.user_id = profiles.id and m.household_id = public.my_household_id()));
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create table public.partner_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  inviter_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.partner_invitations to authenticated;
grant all on public.partner_invitations to service_role;
alter table public.partner_invitations enable row level security;
create policy "inviter reads own invites" on public.partner_invitations for select to authenticated using (inviter_id = auth.uid());

-- CHORES
create table public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  category text,
  difficulty text check (difficulty in ('easy','medium','hard')),
  points int not null check (points between 1 and 1000),
  due_date date,
  recurrence text check (recurrence in ('daily','weekly','monthly')),
  assigned_to uuid,
  verification_method text not null default 'partner' check (verification_method in ('partner','photo','video','self')),
  status text not null default 'available' check (status in ('available','in_progress','awaiting_verification','completed','disputed')),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, delete on public.chores to authenticated;
grant update (title, description, category, difficulty, points, due_date, recurrence, assigned_to, verification_method, updated_at) on public.chores to authenticated;
grant all on public.chores to service_role;
alter table public.chores enable row level security;
create policy "members read chores" on public.chores for select to authenticated using (public.is_household_member(household_id));
create policy "members add chores" on public.chores for insert to authenticated with check (public.is_household_member(household_id) and created_by = auth.uid() and status = 'available');
create policy "members edit chores" on public.chores for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members delete idle chores" on public.chores for delete to authenticated using (public.is_household_member(household_id) and status in ('available','completed','disputed'));

create table public.chore_completions (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null,
  status text not null default 'in_progress' check (status in ('in_progress','awaiting_verification','approved','rejected','cancelled')),
  timer_seconds int not null check (timer_seconds between 1 and 3600),
  points int not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text check (char_length(review_note) <= 500),
  created_at timestamptz not null default now()
);
create unique index one_active_completion_per_chore on public.chore_completions(chore_id) where status in ('in_progress','awaiting_verification');
grant select on public.chore_completions to authenticated;
grant all on public.chore_completions to service_role;
alter table public.chore_completions enable row level security;
create policy "members read completions" on public.chore_completions for select to authenticated using (public.is_household_member(household_id));

create table public.verification_media (
  id uuid primary key default gen_random_uuid(),
  completion_id uuid not null references public.chore_completions(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  uploaded_by uuid not null,
  phase text not null check (phase in ('before','after')),
  kind text not null check (kind in ('video','photo')),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.verification_media to authenticated;
grant all on public.verification_media to service_role;
alter table public.verification_media enable row level security;
create policy "members read media" on public.verification_media for select to authenticated using (public.is_household_member(household_id));
create policy "owner adds media" on public.verification_media for insert to authenticated with check (uploaded_by = auth.uid() and public.is_household_member(household_id)
  and exists (select 1 from public.chore_completions c where c.id = completion_id and c.user_id = auth.uid() and c.household_id = verification_media.household_id and c.status in ('in_progress','awaiting_verification')));
create policy "owner deletes media" on public.verification_media for delete to authenticated using (uploaded_by = auth.uid());

-- REWARDS
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  icon text not null default 'heart',
  cost int not null check (cost between 1 and 10000),
  duration_minutes int check (duration_minutes between 1 and 1440),
  notes text check (char_length(notes) <= 500),
  active boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.rewards to authenticated;
grant all on public.rewards to service_role;
alter table public.rewards enable row level security;
create policy "members read rewards" on public.rewards for select to authenticated using (public.is_household_member(household_id));
create policy "members add rewards" on public.rewards for insert to authenticated with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy "members edit rewards" on public.rewards for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members delete rewards" on public.rewards for delete to authenticated using (public.is_household_member(household_id));

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid references public.rewards(id) on delete set null,
  household_id uuid not null references public.households(id) on delete cascade,
  reward_title text not null,
  requester_id uuid not null,
  cost int not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','completed')),
  response_note text check (char_length(response_note) <= 500),
  responded_by uuid,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  completed_at timestamptz
);
grant select on public.reward_redemptions to authenticated;
grant all on public.reward_redemptions to service_role;
alter table public.reward_redemptions enable row level security;
create policy "members read redemptions" on public.reward_redemptions for select to authenticated using (public.is_household_member(household_id));

-- POINT LEDGER (append-only, written only by trusted functions)
create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null,
  amount int not null,
  kind text not null check (kind in ('earned','reserved','refunded','spent')),
  reference text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);
grant select on public.point_transactions to authenticated;
grant all on public.point_transactions to service_role;
alter table public.point_transactions enable row level security;
create policy "members read ledger" on public.point_transactions for select to authenticated using (public.is_household_member(household_id));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  household_id uuid references public.households(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, update (read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "mark own read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  actor_id uuid,
  action text not null,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.activity_log to authenticated;
grant all on public.activity_log to service_role;
alter table public.activity_log enable row level security;
create policy "members read log" on public.activity_log for select to authenticated using (public.is_household_member(household_id));

-- HELPERS
create or replace function public._notify(_user uuid, _hid uuid, _type text, _title text, _body text) returns void
language sql security definer set search_path = public as $$
  insert into public.notifications(user_id, household_id, type, title, body) values (_user, _hid, _type, _title, _body);
$$;
create or replace function public._log(_hid uuid, _action text, _entity uuid, _meta jsonb default '{}') returns void
language sql security definer set search_path = public as $$
  insert into public.activity_log(household_id, actor_id, action, entity_id, meta) values (_hid, auth.uid(), _action, _entity, _meta);
$$;
create or replace function public._partner_of(_uid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select m2.user_id from public.household_members m1 join public.household_members m2
    on m2.household_id = m1.household_id and m2.user_id <> m1.user_id where m1.user_id = _uid limit 1
$$;
create or replace function public._name(_uid uuid) returns text
language sql stable security definer set search_path = public as $$ select display_name from public.profiles where id = _uid $$;

create or replace function public.balance_of(_uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount),0)::int from public.point_transactions
  where user_id = _uid and household_id = (select household_id from public.household_members where user_id = _uid)
$$;

create or replace function public.seed_household(_hid uuid, _uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.chores(household_id, title, description, category, difficulty, points, verification_method, recurrence, created_by) values
   (_hid,'Wash the dishes','Wash, dry and put away the dishes.','Kitchen','easy',10,'partner','daily',_uid),
   (_hid,'Take out the rubbish','Empty the bins and take bags outside.','General','easy',5,'self','weekly',_uid),
   (_hid,'Vacuum the floor','Vacuum all main rooms.','Cleaning','medium',15,'photo','weekly',_uid),
   (_hid,'Do the laundry','Wash, dry and fold one load.','Laundry','medium',15,'partner','weekly',_uid),
   (_hid,'Clean the bathroom','Sink, toilet, shower and mirror.','Cleaning','hard',25,'video','weekly',_uid),
   (_hid,'Cook a meal','Prepare a home-cooked meal for two.','Kitchen','medium',20,'partner',null,_uid),
   (_hid,'Tidy the living room','Put things away, plump cushions, clear surfaces.','Cleaning','easy',10,'photo',null,_uid);
  insert into public.rewards(household_id, title, description, icon, cost, duration_minutes, created_by) values
   (_hid,'10-minute massage','A relaxing ten-minute massage.','hand',30,10,_uid),
   (_hid,'20-minute massage','A longer, deeper massage.','hand',55,20,_uid),
   (_hid,'Breakfast in bed','Breakfast served with love.','coffee',60,null,_uid),
   (_hid,'Favourite drink','Your favourite drink, made for you.','cup',15,null,_uid),
   (_hid,'Choose the movie','You pick tonight''s movie, no vetoes.','film',25,null,_uid),
   (_hid,'Relaxing back rub','A gentle back rub.','sparkles',20,10,_uid),
   (_hid,'Royal treatment','A personalised prince/princess treatment.','crown',100,null,_uid);
end $$;

-- Every user gets their own household (solo until a partner joins)
create or replace function public.ensure_household() returns uuid
language plpgsql security definer set search_path = public as $$
declare _hid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select household_id into _hid from public.household_members where user_id = auth.uid();
  if _hid is not null then return _hid; end if;
  insert into public.households(created_by) values (auth.uid()) returning id into _hid;
  insert into public.household_members(household_id, user_id) values (_hid, auth.uid());
  perform public.seed_household(_hid, auth.uid());
  return _hid;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare _g text := coalesce(new.raw_user_meta_data->>'gender','prefer_not_to_say');
begin
  if _g not in ('male','female','non_binary','prefer_not_to_say') then _g := 'prefer_not_to_say'; end if;
  insert into public.profiles(id, display_name, gender)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''), nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1), 'Partner'),50), _g);
  if new.raw_user_meta_data ? 'terms_version' then
    insert into public.terms_acceptance(user_id, terms_version, privacy_version)
    values (new.id, new.raw_user_meta_data->>'terms_version', coalesce(new.raw_user_meta_data->>'privacy_version', new.raw_user_meta_data->>'terms_version'));
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.accept_terms(_terms text, _privacy text) returns void
language sql security definer set search_path = public as $$
  insert into public.terms_acceptance(user_id, terms_version, privacy_version) values (auth.uid(), _terms, _privacy);
$$;

-- INVITATIONS
create or replace function public.create_invitation() returns json
language plpgsql security definer set search_path = public as $$
declare _hid uuid; _token text; _exp timestamptz := now() + interval '30 minutes';
  _alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; _bytes bytea; i int;
begin
  _hid := public.ensure_household();
  if (select count(*) from public.household_members where household_id = _hid) >= 2 then
    raise exception 'You are already connected to a partner';
  end if;
  update public.partner_invitations set revoked_at = now() where inviter_id = auth.uid() and used_at is null and revoked_at is null;
  _bytes := extensions.gen_random_bytes(10); _token := '';
  for i in 0..9 loop _token := _token || substr(_alphabet, (get_byte(_bytes, i) % 32) + 1, 1); end loop;
  insert into public.partner_invitations(household_id, inviter_id, token_hash, expires_at)
  values (_hid, auth.uid(), encode(extensions.digest(_token,'sha256'),'hex'), _exp);
  return json_build_object('token', _token, 'expires_at', _exp);
end $$;

create or replace function public.preview_invitation(_token text) returns json
language plpgsql security definer set search_path = public as $$
declare inv public.partner_invitations;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into inv from public.partner_invitations where token_hash = encode(extensions.digest(upper(trim(_token)),'sha256'),'hex');
  if inv.id is null then return json_build_object('valid', false, 'reason', 'not_found'); end if;
  if inv.used_at is not null then return json_build_object('valid', false, 'reason', 'used'); end if;
  if inv.revoked_at is not null then return json_build_object('valid', false, 'reason', 'revoked'); end if;
  if inv.expires_at < now() then return json_build_object('valid', false, 'reason', 'expired'); end if;
  if inv.inviter_id = auth.uid() then return json_build_object('valid', false, 'reason', 'own'); end if;
  return json_build_object('valid', true, 'inviter_name', public._name(inv.inviter_id), 'expires_at', inv.expires_at);
end $$;

create or replace function public.accept_invitation(_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.partner_invitations; _mine uuid; _cnt int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into inv from public.partner_invitations where token_hash = encode(extensions.digest(upper(trim(_token)),'sha256'),'hex') for update;
  if inv.id is null or inv.used_at is not null or inv.revoked_at is not null or inv.expires_at < now() then
    raise exception 'This invitation is invalid, expired or already used'; end if;
  if inv.inviter_id = auth.uid() then raise exception 'You cannot accept your own invitation'; end if;
  perform pg_advisory_xact_lock(hashtext(inv.household_id::text));
  select count(*) into _cnt from public.household_members where household_id = inv.household_id;
  if _cnt >= 2 then raise exception 'That household already has two partners'; end if;
  select household_id into _mine from public.household_members where user_id = auth.uid();
  if _mine is not null then
    if (select count(*) from public.household_members where household_id = _mine) > 1 then
      raise exception 'Disconnect from your current partner first'; end if;
    delete from public.households where id = _mine; -- discard solo household
  end if;
  insert into public.household_members(household_id, user_id) values (inv.household_id, auth.uid());
  update public.partner_invitations set used_at = now(), used_by = auth.uid() where id = inv.id;
  perform public._notify(inv.inviter_id, inv.household_id, 'partner_connected', 'Partner connected', public._name(auth.uid()) || ' joined your household 💞');
  perform public._notify(auth.uid(), inv.household_id, 'partner_connected', 'Partner connected', 'You are now connected with ' || public._name(inv.inviter_id));
  perform public._log(inv.household_id, 'partner_connected', inv.id);
  return inv.household_id;
end $$;

create or replace function public.disconnect_partner() returns void
language plpgsql security definer set search_path = public as $$
declare _hid uuid; _partner uuid; r record;
begin
  select household_id into _hid from public.household_members where user_id = auth.uid();
  if _hid is null then return; end if;
  _partner := public._partner_of(auth.uid());
  if _partner is null then raise exception 'You are not connected to a partner'; end if;
  for r in select * from public.reward_redemptions where household_id = _hid and status in ('pending','accepted') loop
    update public.reward_redemptions set status = 'cancelled', responded_at = now() where id = r.id;
    insert into public.point_transactions(household_id, user_id, amount, kind, reference, description)
    values (_hid, r.requester_id, r.cost, 'refunded', 'refund:' || r.id, 'Refund: ' || r.reward_title || ' (partner disconnected)') on conflict (reference) do nothing;
  end loop;
  update public.chore_completions set status = 'cancelled' where household_id = _hid and status in ('in_progress','awaiting_verification');
  update public.chores set status = 'available' where household_id = _hid and status in ('in_progress','awaiting_verification');
  perform public._log(_hid, 'partner_disconnected', null);
  delete from public.household_members where user_id = auth.uid();
  perform public._notify(_partner, _hid, 'partner_disconnected', 'Partner disconnected', public._name(auth.uid()) || ' has disconnected from the household.');
end $$;

-- CHORE WORKFLOW
create or replace function public.start_chore(_chore uuid, _seconds int) returns uuid
language plpgsql security definer set search_path = public as $$
declare c public.chores; _id uuid;
begin
  select * into c from public.chores where id = _chore for update;
  if c.id is null or not public.is_household_member(c.household_id) then raise exception 'Chore not found'; end if;
  if c.status not in ('available','disputed') then raise exception 'This chore is already in progress or completed'; end if;
  if c.assigned_to is not null and c.assigned_to <> auth.uid() then raise exception 'This chore is assigned to your partner'; end if;
  if _seconds < 1 or _seconds > 3600 then raise exception 'Timer must be between 1 second and 1 hour'; end if;
  insert into public.chore_completions(chore_id, household_id, user_id, timer_seconds, points)
  values (c.id, c.household_id, auth.uid(), _seconds, c.points) returning id into _id;
  update public.chores set status = 'in_progress', updated_at = now() where id = c.id;
  perform public._log(c.household_id, 'chore_started', _id);
  return _id;
end $$;

create or replace function public.cancel_chore(_completion uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cc public.chore_completions;
begin
  select * into cc from public.chore_completions where id = _completion for update;
  if cc.id is null or cc.user_id <> auth.uid() then raise exception 'Not allowed'; end if;
  if cc.status not in ('in_progress','awaiting_verification') then raise exception 'Nothing to cancel'; end if;
  update public.chore_completions set status = 'cancelled' where id = cc.id;
  update public.chores set status = 'available', updated_at = now() where id = cc.chore_id;
  perform public._log(cc.household_id, 'chore_cancelled', cc.id);
end $$;

create or replace function public._award_chore(cc public.chore_completions, _title text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.point_transactions(household_id, user_id, amount, kind, reference, description)
  values (cc.household_id, cc.user_id, cc.points, 'earned', 'chore:' || cc.id, 'Completed: ' || _title)
  on conflict (reference) do nothing;
  update public.chores set status = case when recurrence is null then 'completed' else 'available' end, updated_at = now() where id = cc.chore_id;
  perform public._notify(cc.user_id, cc.household_id, 'points_awarded', '+' || cc.points || ' points', 'For "' || _title || '"');
end $$;

create or replace function public.submit_chore(_completion uuid) returns text
language plpgsql security definer set search_path = public as $$
declare cc public.chore_completions; c public.chores; _partner uuid;
begin
  select * into cc from public.chore_completions where id = _completion for update;
  if cc.id is null or cc.user_id <> auth.uid() then raise exception 'Not allowed'; end if;
  if cc.status <> 'in_progress' then raise exception 'Already submitted'; end if;
  if now() < cc.started_at + make_interval(secs => cc.timer_seconds) then raise exception 'The timer has not finished yet'; end if;
  select * into c from public.chores where id = cc.chore_id;
  if c.verification_method in ('video','photo') and (
     not exists (select 1 from public.verification_media where completion_id = cc.id and phase = 'before') or
     not exists (select 1 from public.verification_media where completion_id = cc.id and phase = 'after')) then
    raise exception 'Before and after evidence is required';
  end if;
  _partner := public._partner_of(auth.uid());
  if c.verification_method = 'self' or _partner is null then
    update public.chore_completions set status = 'approved', submitted_at = now(), reviewed_at = now(), reviewed_by = auth.uid() where id = cc.id;
    cc.status := 'approved';
    perform public._award_chore(cc, c.title);
    perform public._log(cc.household_id, 'chore_self_approved', cc.id);
    return 'approved';
  end if;
  update public.chore_completions set status = 'awaiting_verification', submitted_at = now() where id = cc.id;
  update public.chores set status = 'awaiting_verification', updated_at = now() where id = c.id;
  perform public._notify(_partner, cc.household_id, 'chore_awaiting', 'Chore awaiting your review', public._name(auth.uid()) || ' finished "' || c.title || '"');
  perform public._log(cc.household_id, 'chore_submitted', cc.id);
  return 'awaiting_verification';
end $$;

create or replace function public.review_chore(_completion uuid, _approve boolean, _note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare cc public.chore_completions; _title text;
begin
  select * into cc from public.chore_completions where id = _completion for update;
  if cc.id is null or not public.is_household_member(cc.household_id) then raise exception 'Not found'; end if;
  if cc.user_id = auth.uid() then raise exception 'You cannot review your own chore'; end if;
  if cc.status <> 'awaiting_verification' then raise exception 'This chore is not awaiting review'; end if;
  select title into _title from public.chores where id = cc.chore_id;
  update public.chore_completions set status = case when _approve then 'approved' else 'rejected' end,
    reviewed_by = auth.uid(), reviewed_at = now(), review_note = left(_note, 500) where id = cc.id;
  if _approve then
    perform public._award_chore(cc, _title);
    perform public._notify(cc.user_id, cc.household_id, 'chore_approved', 'Chore approved', '"' || _title || '" was approved');
  else
    update public.chores set status = 'disputed', updated_at = now() where id = cc.chore_id;
    perform public._notify(cc.user_id, cc.household_id, 'chore_rejected', 'Chore needs another look', '"' || _title || '"' || coalesce(': ' || _note, ''));
  end if;
  perform public._log(cc.household_id, case when _approve then 'chore_approved' else 'chore_rejected' end, cc.id, json_build_object('note', _note)::jsonb);
end $$;

-- REWARD WORKFLOW
create or replace function public.request_reward(_reward uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare rw public.rewards; _bal int; _id uuid; _partner uuid;
begin
  select * into rw from public.rewards where id = _reward;
  if rw.id is null or not public.is_household_member(rw.household_id) or not rw.active then raise exception 'Reward not available'; end if;
  _partner := public._partner_of(auth.uid());
  if _partner is null then raise exception 'Connect with your partner before redeeming rewards'; end if;
  perform pg_advisory_xact_lock(hashtext('bal:' || auth.uid()::text));
  _bal := public.balance_of(auth.uid());
  if _bal < rw.cost then raise exception 'Not enough points (you have %, need %)', _bal, rw.cost; end if;
  insert into public.reward_redemptions(reward_id, household_id, reward_title, requester_id, cost)
  values (rw.id, rw.household_id, rw.title, auth.uid(), rw.cost) returning id into _id;
  insert into public.point_transactions(household_id, user_id, amount, kind, reference, description)
  values (rw.household_id, auth.uid(), -rw.cost, 'reserved', 'reserve:' || _id, 'Reserved for: ' || rw.title);
  perform public._notify(_partner, rw.household_id, 'reward_requested', 'Reward requested', public._name(auth.uid()) || ' would love: ' || rw.title);
  perform public._log(rw.household_id, 'reward_requested', _id);
  return _id;
end $$;

create or replace function public.respond_redemption(_id uuid, _accept boolean, _note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare rr public.reward_redemptions;
begin
  select * into rr from public.reward_redemptions where id = _id for update;
  if rr.id is null or not public.is_household_member(rr.household_id) then raise exception 'Not found'; end if;
  if rr.requester_id = auth.uid() then raise exception 'Your partner responds to this request'; end if;
  if rr.status <> 'pending' then raise exception 'This request was already answered'; end if;
  update public.reward_redemptions set status = case when _accept then 'accepted' else 'declined' end,
    responded_by = auth.uid(), responded_at = now(), response_note = left(_note,500) where id = rr.id;
  if not _accept then
    insert into public.point_transactions(household_id, user_id, amount, kind, reference, description)
    values (rr.household_id, rr.requester_id, rr.cost, 'refunded', 'refund:' || rr.id, 'Refund: ' || rr.reward_title || ' (declined)') on conflict (reference) do nothing;
  end if;
  perform public._notify(rr.requester_id, rr.household_id, case when _accept then 'reward_accepted' else 'reward_declined' end,
    case when _accept then 'Reward accepted 💝' else 'Reward declined' end, rr.reward_title || coalesce(': ' || _note, ''));
  perform public._log(rr.household_id, case when _accept then 'reward_accepted' else 'reward_declined' end, rr.id);
end $$;

create or replace function public.cancel_redemption(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare rr public.reward_redemptions;
begin
  select * into rr from public.reward_redemptions where id = _id for update;
  if rr.id is null or rr.requester_id <> auth.uid() then raise exception 'Not allowed'; end if;
  if rr.status not in ('pending','accepted') then raise exception 'Cannot cancel now'; end if;
  update public.reward_redemptions set status = 'cancelled', responded_at = now() where id = rr.id;
  insert into public.point_transactions(household_id, user_id, amount, kind, reference, description)
  values (rr.household_id, rr.requester_id, rr.cost, 'refunded', 'refund:' || rr.id, 'Refund: ' || rr.reward_title || ' (cancelled)') on conflict (reference) do nothing;
  perform public._log(rr.household_id, 'reward_cancelled', rr.id);
end $$;

create or replace function public.complete_redemption(_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare rr public.reward_redemptions;
begin
  select * into rr from public.reward_redemptions where id = _id for update;
  if rr.id is null or not public.is_household_member(rr.household_id) then raise exception 'Not found'; end if;
  if rr.status <> 'accepted' then raise exception 'Only accepted rewards can be completed'; end if;
  update public.reward_redemptions set status = 'completed', completed_at = now() where id = rr.id;
  insert into public.point_transactions(household_id, user_id, amount, kind, reference, description)
  values (rr.household_id, rr.requester_id, 0, 'spent', 'spend:' || rr.id, 'Enjoyed: ' || rr.reward_title) on conflict (reference) do nothing;
  perform public._notify(case when auth.uid() = rr.requester_id then public._partner_of(rr.requester_id) else rr.requester_id end,
    rr.household_id, 'reward_completed', 'Reward completed ✨', rr.reward_title);
  perform public._log(rr.household_id, 'reward_completed', rr.id);
end $$;

-- lock down internal helpers
revoke execute on function public._notify(uuid,uuid,text,text,text), public._log(uuid,text,uuid,jsonb), public._award_chore(public.chore_completions,text), public.seed_household(uuid,uuid), public.handle_new_user() from public, anon, authenticated;
revoke execute on all functions in schema public from anon;

alter publication supabase_realtime add table public.chores, public.chore_completions, public.reward_redemptions, public.point_transactions, public.notifications, public.household_members;