-- Animal shelter: pets catalog and adoption waivers

create table public.shelter_pets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  species text not null,
  description text not null default '',
  emoji text not null default '🐾',
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  constraint shelter_pets_name_unique unique (name)
);

create unique index shelter_pets_name_lower_idx on public.shelter_pets (lower(name));

create table public.shelter_adoptions (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.shelter_pets(id) on delete restrict,
  visitor_name text not null,
  signature_png text not null,
  signed_at timestamptz not null default now()
);

create index shelter_adoptions_pet_id_idx on public.shelter_adoptions (pet_id);

alter table public.shelter_pets enable row level security;
alter table public.shelter_adoptions enable row level security;

create policy "Anyone can read shelter pets"
  on public.shelter_pets for select
  to anon, authenticated
  using (true);

-- Adoptions are written only via shelter_complete_adoption RPC

create or replace function public.shelter_complete_adoption(
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

  insert into public.shelter_adoptions (pet_id, visitor_name, signature_png)
  values (p_pet_id, v_name, p_signature_png);

  update public.shelter_pets
  set is_available = false
  where id = p_pet_id;

  return jsonb_build_object('ok', true, 'pet_name', v_pet.name);
end;
$$;

grant execute on function public.shelter_complete_adoption(uuid, text, text) to anon, authenticated;

insert into public.shelter_pets (name, species, description, emoji, is_available) values
  ('Biscuit', 'Dog', 'Loves belly rubs and naps in sunbeams.', '🐕', true),
  ('Mochi', 'Cat', 'Quiet observer. Judges your typing speed.', '🐈', true),
  ('Pepper', 'Rabbit', 'Hops twice before every snack decision.', '🐇', true),
  ('Captain Squawk', 'Parrot', 'Already found a pirate family.', '🦜', false),
  ('Noodle', 'Snake', 'Very chill. Already adopted.', '🐍', false);
