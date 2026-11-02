-- Pending adoption requests: worker approves or denies (visitor sees result via realtime)

create table public.shelter_adoption_requests (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.shelter_pets(id) on delete cascade,
  visitor_name text not null,
  signature_png text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index shelter_adoption_requests_status_idx
  on public.shelter_adoption_requests (status, created_at desc);
create index shelter_adoption_requests_pet_id_idx
  on public.shelter_adoption_requests (pet_id);

alter table public.shelter_adoption_requests enable row level security;

create policy "Anyone can read adoption requests"
  on public.shelter_adoption_requests for select
  to anon, authenticated
  using (true);

create or replace function public.shelter_submit_adoption_request(
  p_pet_id uuid,
  p_visitor_name text,
  p_signature_png text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pet public.shelter_pets%rowtype;
  v_name text;
  v_request_id uuid;
begin
  v_name := trim(p_visitor_name);

  if v_name = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_name');
  end if;

  if p_signature_png is null or length(trim(p_signature_png)) < 32 then
    return jsonb_build_object('ok', false, 'code', 'invalid_signature');
  end if;

  select * into v_pet
  from public.shelter_pets
  where id = p_pet_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if not v_pet.is_available then
    return jsonb_build_object('ok', false, 'code', 'unavailable');
  end if;

  if exists (
    select 1 from public.shelter_adoption_requests
    where pet_id = p_pet_id and status = 'pending'
  ) then
    return jsonb_build_object('ok', false, 'code', 'already_pending');
  end if;

  insert into public.shelter_adoption_requests (pet_id, visitor_name, signature_png, status)
  values (p_pet_id, v_name, p_signature_png, 'pending')
  returning id into v_request_id;

  return jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'pet_name', v_pet.name
  );
end;
$$;

create or replace function public.shelter_decide_adoption_request(
  p_request_id uuid,
  p_approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.shelter_adoption_requests%rowtype;
  v_pet public.shelter_pets%rowtype;
begin
  select * into v_req
  from public.shelter_adoption_requests
  where id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'not_pending');
  end if;

  if p_approve then
    select * into v_pet
    from public.shelter_pets
    where id = v_req.pet_id
    for update;

    if not found then
      return jsonb_build_object('ok', false, 'code', 'not_found');
    end if;

    if not v_pet.is_available then
      update public.shelter_adoption_requests
      set status = 'denied', decided_at = now()
      where id = p_request_id;
      return jsonb_build_object('ok', true, 'status', 'denied', 'pet_name', v_pet.name);
    end if;

    insert into public.shelter_adoptions (pet_id, visitor_name, signature_png)
    values (v_req.pet_id, v_req.visitor_name, v_req.signature_png);

    update public.shelter_pets
    set is_available = false
    where id = v_req.pet_id;

    update public.shelter_adoption_requests
    set status = 'approved', decided_at = now()
    where id = p_request_id;

    return jsonb_build_object('ok', true, 'status', 'approved', 'pet_name', v_pet.name);
  end if;

  update public.shelter_adoption_requests
  set status = 'denied', decided_at = now()
  where id = p_request_id;

  select * into v_pet from public.shelter_pets where id = v_req.pet_id;

  return jsonb_build_object(
    'ok', true,
    'status', 'denied',
    'pet_name', coalesce(v_pet.name, 'the listing')
  );
end;
$$;

grant execute on function public.shelter_submit_adoption_request(uuid, text, text) to anon, authenticated;
grant execute on function public.shelter_decide_adoption_request(uuid, boolean) to anon, authenticated;

alter publication supabase_realtime add table public.shelter_adoption_requests;
