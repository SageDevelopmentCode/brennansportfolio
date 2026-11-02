-- Short lobby codes for Iron Desk (one digit + one letter, e.g. 7K)

alter table public.gym_check_in_requests
  add column lobby_code text;

alter table public.gym_check_in_requests
  add constraint gym_check_in_requests_lobby_code_format
  check (lobby_code is null or lobby_code ~ '^[0-9][A-Z]$');

create unique index gym_check_in_requests_pending_lobby_code_idx
  on public.gym_check_in_requests (lobby_code)
  where status = 'pending' and lobby_code is not null;

create or replace function public.gym_submit_check_in(
  p_family_name text,
  p_member_summary text,
  p_notes text default null
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
begin
  v_family := trim(p_family_name);
  v_members := trim(p_member_summary);
  v_notes := nullif(trim(coalesce(p_notes, '')), '');

  if v_family = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_family');
  end if;

  if v_members = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_members');
  end if;

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

  return jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'family_name', v_family,
    'lobby_code', v_lobby_code
  );
end;
$$;
