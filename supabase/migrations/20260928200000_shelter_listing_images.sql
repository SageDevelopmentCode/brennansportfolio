-- Listing photos (pets, people, anything)

alter table public.shelter_pets
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('shelter-listings', 'shelter-listings', true)
on conflict (id) do update set public = true;

create policy "Public read shelter listing images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'shelter-listings');

create policy "Anyone can upload shelter listing images"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'shelter-listings');

drop function if exists public.shelter_add_listing(text, text, text, text);

create or replace function public.shelter_add_listing(
  p_name text,
  p_species text,
  p_description text,
  p_emoji text,
  p_image_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_species text;
  v_description text;
  v_emoji text;
  v_image_url text;
  v_row public.shelter_pets%rowtype;
begin
  v_name := left(trim(p_name), 80);
  v_species := left(trim(p_species), 80);
  v_description := left(coalesce(trim(p_description), ''), 500);
  v_emoji := left(trim(coalesce(p_emoji, '')), 8);
  v_image_url := left(trim(coalesce(p_image_url, '')), 2048);

  if v_name = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_name');
  end if;

  if v_species = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_type');
  end if;

  if v_image_url = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_image');
  end if;

  if v_emoji = '' then
    v_emoji := '🐾';
  end if;

  insert into public.shelter_pets (name, species, description, emoji, image_url, is_available)
  values (v_name, v_species, v_description, v_emoji, v_image_url, true)
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'pet', jsonb_build_object(
      'id', v_row.id,
      'name', v_row.name,
      'species', v_row.species,
      'description', v_row.description,
      'emoji', v_row.emoji,
      'image_url', v_row.image_url,
      'is_available', v_row.is_available,
      'created_at', v_row.created_at
    )
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'duplicate_name');
end;
$$;

grant execute on function public.shelter_add_listing(text, text, text, text, text) to anon, authenticated;
