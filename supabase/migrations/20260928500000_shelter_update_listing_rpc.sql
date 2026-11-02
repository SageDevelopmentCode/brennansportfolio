-- Staff (client) can update shelter listing details via RPC (not availability)

create or replace function public.shelter_update_listing(
  p_pet_id uuid,
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

  if v_image_url = '' or v_image_url !~* '^https?://' then
    return jsonb_build_object('ok', false, 'code', 'invalid_image');
  end if;

  if v_emoji = '' then
    v_emoji := '🐾';
  end if;

  update public.shelter_pets
  set
    name = v_name,
    species = v_species,
    description = v_description,
    emoji = v_emoji,
    image_url = v_image_url
  where id = p_pet_id
  returning * into v_row;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

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

grant execute on function public.shelter_update_listing(uuid, text, text, text, text, text) to anon, authenticated;
