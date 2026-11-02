-- Children on gym check-in (linked to each request)

create table public.gym_check_in_children (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.gym_check_in_requests(id) on delete cascade,
  name text not null,
  age smallint not null check (age >= 0 and age <= 120),
  height text not null,
  size text not null,
  favorite_food text not null,
  created_at timestamptz not null default now()
);

create index gym_check_in_children_request_id_idx
  on public.gym_check_in_children (request_id);

alter table public.gym_check_in_children enable row level security;

create policy "Anyone can read gym check-in children"
  on public.gym_check_in_children for select
  to anon, authenticated
  using (true);

create or replace function public.gym_submit_check_in(
  p_family_name text,
  p_member_summary text,
  p_notes text default null,
  p_children jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family text;
  v_members text;
  v_notes text;
  v_request_id uuid;
  v_lobby_code text;
  v_attempts int := 0;
  v_child jsonb;
  v_name text;
  v_height text;
  v_size text;
  v_favorite_food text;
  v_age smallint;
  v_children jsonb;
begin
  v_family := trim(p_family_name);
  v_members := trim(p_member_summary);
  v_notes := nullif(trim(coalesce(p_notes, '')), '');
  v_children := coalesce(p_children, '[]'::jsonb);

  if v_family = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_family');
  end if;

  if v_members = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_members');
  end if;

  if jsonb_typeof(v_children) <> 'array' then
    return jsonb_build_object('ok', false, 'code', 'invalid_child');
  end if;

  for v_child in select value from jsonb_array_elements(v_children)
  loop
    v_name := trim(coalesce(v_child->>'name', ''));
    v_height := trim(coalesce(v_child->>'height', ''));
    v_size := trim(coalesce(v_child->>'size', ''));
    v_favorite_food := trim(coalesce(v_child->>'favorite_food', ''));

    if v_name = ''
      or v_height = ''
      or v_size = ''
      or v_favorite_food = ''
    then
      return jsonb_build_object('ok', false, 'code', 'invalid_child');
    end if;

    begin
      v_age := (v_child->>'age')::smallint;
    exception
      when others then
        return jsonb_build_object('ok', false, 'code', 'invalid_child');
    end;

    if v_age is null or v_age < 0 or v_age > 120 then
      return jsonb_build_object('ok', false, 'code', 'invalid_child');
    end if;
  end loop;

  loop
    v_lobby_code :=
      (floor(random() * 10)::int)::text
      || chr(65 + floor(random() * 26)::int);

    if not exists (
      select 1
      from public.gym_check_in_requests
      where status = 'pending'
        and lobby_code = v_lobby_code
    ) then
      exit;
    end if;

    v_attempts := v_attempts + 1;
    if v_attempts > 100 then
      raise exception 'could not allocate gym lobby code';
    end if;
  end loop;

  insert into public.gym_check_in_requests (
    family_name,
    member_summary,
    notes,
    status,
    lobby_code
  )
  values (v_family, v_members, v_notes, 'pending', v_lobby_code)
  returning id into v_request_id;

  for v_child in select value from jsonb_array_elements(v_children)
  loop
    v_name := trim(v_child->>'name');
    v_height := trim(v_child->>'height');
    v_size := trim(v_child->>'size');
    v_favorite_food := trim(v_child->>'favorite_food');
    v_age := (v_child->>'age')::smallint;

    insert into public.gym_check_in_children (
      request_id,
      name,
      age,
      height,
      size,
      favorite_food
    )
    values (
      v_request_id,
      v_name,
      v_age,
      v_height,
      v_size,
      v_favorite_food
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'family_name', v_family,
    'lobby_code', v_lobby_code
  );
end;
$$;

grant execute on function public.gym_submit_check_in(text, text, text, jsonb) to anon, authenticated;
