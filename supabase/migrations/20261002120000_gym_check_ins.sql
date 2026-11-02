-- Gym front-desk check-ins: employee submits, owner approves/denies, family watches via realtime

create table public.gym_check_in_requests (
  id uuid primary key default gen_random_uuid(),
  family_name text not null,
  member_summary text not null,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index gym_check_in_requests_status_idx
  on public.gym_check_in_requests (status, created_at desc);

alter table public.gym_check_in_requests enable row level security;

create policy "Anyone can read gym check-ins"
  on public.gym_check_in_requests for select
  to anon, authenticated
  using (true);

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

  insert into public.gym_check_in_requests (family_name, member_summary, notes, status)
  values (v_family, v_members, v_notes, 'pending')
  returning id into v_request_id;

  return jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'family_name', v_family
  );
end;
$$;

create or replace function public.gym_decide_check_in(
  p_request_id uuid,
  p_approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.gym_check_in_requests%rowtype;
begin
  select * into v_req
  from public.gym_check_in_requests
  where id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'not_pending');
  end if;

  if p_approve then
    update public.gym_check_in_requests
    set status = 'approved', decided_at = now()
    where id = p_request_id;

    return jsonb_build_object(
      'ok', true,
      'status', 'approved',
      'family_name', v_req.family_name
    );
  end if;

  update public.gym_check_in_requests
  set status = 'denied', decided_at = now()
  where id = p_request_id;

  return jsonb_build_object(
    'ok', true,
    'status', 'denied',
    'family_name', v_req.family_name
  );
end;
$$;

grant execute on function public.gym_submit_check_in(text, text, text) to anon, authenticated;
grant execute on function public.gym_decide_check_in(uuid, boolean) to anon, authenticated;

alter publication supabase_realtime add table public.gym_check_in_requests;
