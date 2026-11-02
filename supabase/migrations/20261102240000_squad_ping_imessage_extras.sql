-- Squad Ping: profile photos, personal wallpapers, inbox, image messages, reactions

create table public.squad_user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  call_sign text not null,
  avatar text not null default '🦈',
  photo_url text,
  updated_at timestamptz not null default now(),
  constraint squad_user_profiles_call_sign_len check (char_length(trim(call_sign)) between 2 and 16),
  constraint squad_user_profiles_avatar_len check (char_length(avatar) between 1 and 8)
);

alter table public.squad_user_profiles enable row level security;

create policy "Users read squad profiles"
  on public.squad_user_profiles for select
  to authenticated
  using (true);

create policy "Users manage own squad profile"
  on public.squad_user_profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.squad_members
  add column if not exists photo_url text,
  add column if not exists wallpaper_url text;

alter table public.squad_messages
  add column if not exists photo_url text,
  add column if not exists kind text not null default 'text';

alter table public.squad_messages
  drop constraint if exists squad_messages_body_len;

alter table public.squad_messages
  add constraint squad_messages_body_len check (
    (kind = 'text' and char_length(trim(body)) between 1 and 200)
    or (kind = 'image' and char_length(trim(body)) <= 200)
  );

alter table public.squad_messages
  add constraint squad_messages_kind_check check (kind in ('text', 'image'));

alter table public.squad_messages
  add constraint squad_messages_image_has_url check (
    kind <> 'image' or (photo_url is not null and char_length(trim(photo_url)) > 0)
  );

create table public.squad_message_reactions (
  message_id uuid not null references public.squad_messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id),
  constraint squad_message_reactions_emoji_len check (char_length(emoji) between 1 and 8)
);

create index squad_message_reactions_message_idx
  on public.squad_message_reactions (message_id);

alter table public.squad_message_reactions enable row level security;

create policy "Members read reactions"
  on public.squad_message_reactions for select
  to authenticated
  using (
    exists (
      select 1
      from public.squad_messages msg
      where msg.id = message_id
        and public.squad_is_member(msg.base_id)
    )
  );

create policy "Members add reactions"
  on public.squad_message_reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.squad_messages msg
      where msg.id = message_id
        and public.squad_is_member(msg.base_id)
    )
  );

create policy "Users update own reactions"
  on public.squad_message_reactions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users delete own reactions"
  on public.squad_message_reactions for delete
  to authenticated
  using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('squad-ping', 'squad-ping', true)
on conflict (id) do update set public = true;

create policy "Public read squad ping assets"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'squad-ping');

create policy "Users upload own squad ping assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'squad-ping'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own squad ping assets"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'squad-ping'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own squad ping assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'squad-ping'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.squad_upsert_user_profile(
  p_call_sign text,
  p_avatar text,
  p_photo_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_call_sign text;
  v_avatar text;
  v_photo text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  v_call_sign := left(trim(p_call_sign), 16);
  v_avatar := left(trim(coalesce(p_avatar, '')), 8);
  v_photo := nullif(left(trim(coalesce(p_photo_url, '')), 2048), '');

  if char_length(v_call_sign) < 2 then
    raise exception 'invalid call sign';
  end if;

  if v_avatar = '' then
    v_avatar := '🦈';
  end if;

  insert into public.squad_user_profiles (user_id, call_sign, avatar, photo_url, updated_at)
  values (v_uid, v_call_sign, v_avatar, v_photo, now())
  on conflict (user_id) do update
    set call_sign = excluded.call_sign,
        avatar = excluded.avatar,
        photo_url = coalesce(excluded.photo_url, public.squad_user_profiles.photo_url),
        updated_at = now();

  update public.squad_members
  set call_sign = v_call_sign,
      avatar = v_avatar,
      photo_url = coalesce(v_photo, photo_url)
  where user_id = v_uid;
end;
$$;

grant execute on function public.squad_upsert_user_profile(text, text, text) to authenticated;

create or replace function public.squad_set_wallpaper(
  p_base_id uuid,
  p_wallpaper_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_url text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  if not public.squad_is_member(p_base_id) then
    return jsonb_build_object('ok', false, 'code', 'not_member');
  end if;

  v_url := nullif(left(trim(coalesce(p_wallpaper_url, '')), 2048), '');

  update public.squad_members
  set wallpaper_url = v_url
  where base_id = p_base_id and user_id = v_uid;

  return jsonb_build_object('ok', true, 'wallpaper_url', v_url);
end;
$$;

grant execute on function public.squad_set_wallpaper(uuid, text) to authenticated;

drop function if exists public.squad_create_base(text, text, text);
drop function if exists public.squad_join_base(text, text, text);

create or replace function public.squad_create_base(
  p_name text,
  p_call_sign text,
  p_avatar text,
  p_photo_url text default null
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
  v_photo text;
  v_code text;
  v_base_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  v_name := left(trim(p_name), 40);
  v_call_sign := left(trim(p_call_sign), 16);
  v_avatar := left(trim(coalesce(p_avatar, '')), 8);
  v_photo := nullif(left(trim(coalesce(p_photo_url, '')), 2048), '');

  if v_name = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_name');
  end if;

  if char_length(v_call_sign) < 2 then
    return jsonb_build_object('ok', false, 'code', 'invalid_call_sign');
  end if;

  if v_avatar = '' then
    v_avatar := '🦈';
  end if;

  perform public.squad_upsert_user_profile(v_call_sign, v_avatar, v_photo);

  v_code := public.squad_generate_code();

  insert into public.squad_bases (code, name, created_by)
  values (v_code, v_name, v_uid)
  returning id into v_base_id;

  insert into public.squad_members (base_id, user_id, call_sign, avatar, photo_url)
  values (v_base_id, v_uid, v_call_sign, v_avatar, v_photo);

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
  p_avatar text,
  p_photo_url text default null
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
  v_photo text;
  v_base public.squad_bases%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  v_code := upper(trim(replace(p_code, ' ', '')));
  v_call_sign := left(trim(p_call_sign), 16);
  v_avatar := left(trim(coalesce(p_avatar, '')), 8);
  v_photo := nullif(left(trim(coalesce(p_photo_url, '')), 2048), '');

  if v_code !~ '^[A-Z]+-[A-Z0-9]{4}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_code');
  end if;

  if char_length(v_call_sign) < 2 then
    return jsonb_build_object('ok', false, 'code', 'invalid_call_sign');
  end if;

  if v_avatar = '' then
    v_avatar := '🦈';
  end if;

  perform public.squad_upsert_user_profile(v_call_sign, v_avatar, v_photo);

  select * into v_base
  from public.squad_bases
  where code = v_code;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  insert into public.squad_members (base_id, user_id, call_sign, avatar, photo_url)
  values (v_base.id, v_uid, v_call_sign, v_avatar, v_photo)
  on conflict (base_id, user_id) do update
    set call_sign = excluded.call_sign,
        avatar = excluded.avatar,
        photo_url = coalesce(excluded.photo_url, public.squad_members.photo_url),
        joined_at = now();

  return jsonb_build_object(
    'ok', true,
    'base_id', v_base.id,
    'code', v_base.code,
    'name', v_base.name
  );
end;
$$;

grant execute on function public.squad_create_base(text, text, text, text) to authenticated;
grant execute on function public.squad_join_base(text, text, text, text) to authenticated;

create or replace function public.squad_update_profile(
  p_call_sign text,
  p_avatar text,
  p_photo_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  begin
    perform public.squad_upsert_user_profile(p_call_sign, p_avatar, p_photo_url);
  exception
    when others then
      return jsonb_build_object('ok', false, 'code', 'invalid_profile');
  end;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.squad_update_profile(text, text, text) to authenticated;

create or replace function public.squad_list_my_chats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_chats jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'base_id', b.id,
        'code', b.code,
        'name', b.name,
        'preview', coalesce(last_msg.preview, 'No messages yet'),
        'last_at', last_msg.last_at,
        'wallpaper_url', m.wallpaper_url
      )
      order by coalesce(last_msg.last_at, m.joined_at) desc
    ),
    '[]'::jsonb
  )
  into v_chats
  from public.squad_members m
  join public.squad_bases b on b.id = m.base_id
  left join lateral (
    select
      case
        when msg.kind = 'image' then 'Photo'
        else left(msg.body, 120)
      end as preview,
      msg.created_at as last_at
    from public.squad_messages msg
    where msg.base_id = b.id
    order by msg.created_at desc
    limit 1
  ) last_msg on true
  where m.user_id = v_uid;

  return jsonb_build_object('ok', true, 'chats', v_chats);
end;
$$;

grant execute on function public.squad_list_my_chats() to authenticated;

alter publication supabase_realtime add table public.squad_message_reactions;
