-- Squad Ping: secret-base chat with room codes and realtime messages

create table public.squad_bases (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint squad_bases_code_format check (code ~ '^[A-Z]+-[A-Z0-9]{4}$'),
  constraint squad_bases_name_len check (char_length(trim(name)) between 1 and 40)
);

create index squad_bases_created_by_idx on public.squad_bases (created_by);

create table public.squad_members (
  base_id uuid not null references public.squad_bases (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  call_sign text not null,
  avatar text not null,
  joined_at timestamptz not null default now(),
  primary key (base_id, user_id),
  constraint squad_members_call_sign_len check (char_length(trim(call_sign)) between 2 and 16),
  constraint squad_members_avatar_len check (char_length(avatar) between 1 and 8)
);

create index squad_members_user_id_idx on public.squad_members (user_id);

create table public.squad_messages (
  id uuid primary key default gen_random_uuid(),
  base_id uuid not null references public.squad_bases (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  call_sign text not null,
  avatar text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint squad_messages_body_len check (char_length(trim(body)) between 1 and 200)
);

create index squad_messages_base_created_idx
  on public.squad_messages (base_id, created_at desc);

alter table public.squad_bases enable row level security;
alter table public.squad_members enable row level security;
alter table public.squad_messages enable row level security;

create or replace function public.squad_is_member(p_base_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.squad_members m
    where m.base_id = p_base_id
      and m.user_id = auth.uid()
  );
$$;

revoke all on function public.squad_is_member(uuid) from public;
grant execute on function public.squad_is_member(uuid) to authenticated;

create policy "Members read their bases"
  on public.squad_bases for select
  to authenticated
  using (public.squad_is_member(id));

create policy "Members read squad roster"
  on public.squad_members for select
  to authenticated
  using (public.squad_is_member(base_id));

create policy "Members read messages"
  on public.squad_messages for select
  to authenticated
  using (public.squad_is_member(base_id));

create policy "Members send messages"
  on public.squad_messages for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.squad_is_member(base_id)
  );

create or replace function public.squad_generate_code()
returns text
language plpgsql
as $$
declare
  v_words text[] := array[
    'SHARK', 'TIGER', 'VIPER', 'COMET', 'BLAST', 'NINJA',
    'ROBOT', 'STORM', 'PHANTOM', 'COMET', 'PIXEL', 'ORBIT'
  ];
  v_word text;
  v_suffix text;
  v_code text;
  v_attempts int := 0;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_i int;
begin
  loop
    v_word := v_words[1 + floor(random() * array_length(v_words, 1))::int];
    v_suffix := '';
    for v_i in 1..4 loop
      v_suffix := v_suffix || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    end loop;
    v_code := v_word || '-' || v_suffix;

    if not exists (select 1 from public.squad_bases b where b.code = v_code) then
      return v_code;
    end if;

    v_attempts := v_attempts + 1;
    if v_attempts > 120 then
      raise exception 'could not allocate squad code';
    end if;
  end loop;
end;
$$;

create or replace function public.squad_create_base(
  p_name text,
  p_call_sign text,
  p_avatar text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_call_sign text;
  v_avatar text;
  v_code text;
  v_base_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  v_name := left(trim(p_name), 40);
  v_call_sign := left(trim(p_call_sign), 16);
  v_avatar := left(trim(coalesce(p_avatar, '')), 8);

  if v_name = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_name');
  end if;

  if char_length(v_call_sign) < 2 then
    return jsonb_build_object('ok', false, 'code', 'invalid_call_sign');
  end if;

  if v_avatar = '' then
    v_avatar := '🦈';
  end if;

  v_code := public.squad_generate_code();

  insert into public.squad_bases (code, name, created_by)
  values (v_code, v_name, v_uid)
  returning id into v_base_id;

  insert into public.squad_members (base_id, user_id, call_sign, avatar)
  values (v_base_id, v_uid, v_call_sign, v_avatar);

  return jsonb_build_object(
    'ok', true,
    'base_id', v_base_id,
    'code', v_code,
    'name', v_name
  );
end;
$$;

create or replace function public.squad_join_base(
  p_code text,
  p_call_sign text,
  p_avatar text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_call_sign text;
  v_avatar text;
  v_base public.squad_bases%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  v_code := upper(trim(replace(p_code, ' ', '')));
  v_call_sign := left(trim(p_call_sign), 16);
  v_avatar := left(trim(coalesce(p_avatar, '')), 8);

  if v_code !~ '^[A-Z]+-[A-Z0-9]{4}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_code');
  end if;

  if char_length(v_call_sign) < 2 then
    return jsonb_build_object('ok', false, 'code', 'invalid_call_sign');
  end if;

  if v_avatar = '' then
    v_avatar := '🦈';
  end if;

  select * into v_base
  from public.squad_bases
  where code = v_code;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  insert into public.squad_members (base_id, user_id, call_sign, avatar)
  values (v_base.id, v_uid, v_call_sign, v_avatar)
  on conflict (base_id, user_id) do update
    set call_sign = excluded.call_sign,
        avatar = excluded.avatar,
        joined_at = now();

  return jsonb_build_object(
    'ok', true,
    'base_id', v_base.id,
    'code', v_base.code,
    'name', v_base.name
  );
end;
$$;

grant execute on function public.squad_create_base(text, text, text) to authenticated;
grant execute on function public.squad_join_base(text, text, text) to authenticated;

alter publication supabase_realtime add table public.squad_messages;
