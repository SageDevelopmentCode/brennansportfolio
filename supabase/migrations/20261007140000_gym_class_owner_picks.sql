-- Iron Desk: owner picks 7 class attributes + required teacher on create

alter table public.gym_classes
  add column if not exists chaos_level text,
  add column if not exists mascot_creature text,
  add column if not exists sweat_rating text,
  add column if not exists battle_cry text,
  add column if not exists forbidden_move text,
  add column if not exists taco_budget text,
  add column if not exists dungeon_room text;

drop function if exists public.gym_create_class(text);

create or replace function public.gym_create_class(
  p_name text,
  p_teacher_id uuid,
  p_chaos_level text,
  p_mascot_creature text,
  p_sweat_rating text,
  p_battle_cry text,
  p_forbidden_move text,
  p_taco_budget text,
  p_dungeon_room text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_chaos text;
  v_sweat text;
  v_taco text;
  v_dungeon text;
  v_id uuid;
begin
  v_name := trim(coalesce(p_name, ''));
  if v_name = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_name');
  end if;

  if p_teacher_id is null or not exists (
    select 1 from public.gym_teachers where id = p_teacher_id
  ) then
    return jsonb_build_object('ok', false, 'code', 'invalid_teacher');
  end if;

  v_chaos := lower(trim(coalesce(p_chaos_level, '')));
  if v_chaos not in ('calm', 'spicy', 'butt_face_approved') then
    return jsonb_build_object('ok', false, 'code', 'invalid_class_profile');
  end if;

  v_sweat := lower(trim(coalesce(p_sweat_rating, '')));
  if v_sweat not in ('glitter', 'normal', 'niagara') then
    return jsonb_build_object('ok', false, 'code', 'invalid_class_profile');
  end if;

  v_taco := lower(trim(coalesce(p_taco_budget, '')));
  if v_taco not in ('crumbs', 'standard', 'unlimited') then
    return jsonb_build_object('ok', false, 'code', 'invalid_class_profile');
  end if;

  v_dungeon := lower(trim(coalesce(p_dungeon_room, '')));
  if v_dungeon not in ('boiler_room', 'mirror_maze', 'parking_lot', 'vending_alley') then
    return jsonb_build_object('ok', false, 'code', 'invalid_class_profile');
  end if;

  if trim(coalesce(p_mascot_creature, '')) = ''
    or trim(coalesce(p_battle_cry, '')) = ''
    or trim(coalesce(p_forbidden_move, '')) = ''
  then
    return jsonb_build_object('ok', false, 'code', 'invalid_class_profile');
  end if;

  insert into public.gym_classes (
    name,
    teacher_id,
    chaos_level,
    mascot_creature,
    sweat_rating,
    battle_cry,
    forbidden_move,
    taco_budget,
    dungeon_room
  )
  values (
    v_name,
    p_teacher_id,
    v_chaos,
    trim(p_mascot_creature),
    v_sweat,
    trim(p_battle_cry),
    trim(p_forbidden_move),
    v_taco,
    v_dungeon
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'class_id', v_id, 'name', v_name);
end;
$$;

grant execute on function public.gym_create_class(
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to anon, authenticated;
