-- Family-chosen codes after owner approval (one digit + one letter, e.g. 4M)

alter table public.gym_check_in_requests
  add column family_code text;

alter table public.gym_check_in_requests
  add constraint gym_check_in_requests_family_code_format
  check (family_code is null or family_code ~ '^[0-9][A-Z]$');

create unique index gym_check_in_requests_family_code_idx
  on public.gym_check_in_requests (family_code)
  where family_code is not null;

create or replace function public.gym_submit_family_code(
  p_request_id uuid,
  p_family_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.gym_check_in_requests%rowtype;
  v_raw text;
  v_code text;
  v_letter text;
begin
  v_raw := trim(coalesce(p_family_code, ''));
  if length(v_raw) <> 2 then
    return jsonb_build_object('ok', false, 'code', 'invalid_format');
  end if;

  if v_raw !~ '^[0-9][a-zA-Z]$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_format');
  end if;

  v_letter := upper(substr(v_raw, 2, 1));
  v_code := substr(v_raw, 1, 1) || v_letter;

  select * into v_req
  from public.gym_check_in_requests
  where id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_req.status <> 'approved' then
    return jsonb_build_object('ok', false, 'code', 'not_approved');
  end if;

  if v_req.family_code is not null then
    return jsonb_build_object('ok', false, 'code', 'already_set');
  end if;

  if exists (
    select 1
    from public.gym_check_in_requests
    where family_code = v_code
      and id <> p_request_id
  ) then
    return jsonb_build_object('ok', false, 'code', 'taken');
  end if;

  update public.gym_check_in_requests
  set family_code = v_code
  where id = p_request_id;

  return jsonb_build_object(
    'ok', true,
    'family_code', v_code,
    'family_name', v_req.family_name
  );
end;
$$;

grant execute on function public.gym_submit_family_code(uuid, text) to anon, authenticated;
