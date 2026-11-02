-- Iron Desk: teacher signup application fields

alter table public.gym_teachers
  add column if not exists experience text,
  add column if not exists age smallint,
  add column if not exists body_size text,
  add column if not exists gender text,
  add column if not exists signup_reason text,
  add column if not exists other_activities text,
  add column if not exists is_single boolean,
  add column if not exists has_children boolean,
  add column if not exists favorite_food text,
  add column if not exists contact text,
  add column if not exists city_or_area text,
  add column if not exists certifications text,
  add column if not exists availability text,
  add column if not exists emergency_contact text,
  add column if not exists fun_fact text,
  add column if not exists how_heard text,
  add column if not exists social_media text,
  add column if not exists allergies text,
  add column if not exists favorite_exercise text,
  add column if not exists years_teaching smallint;

drop function if exists public.gym_register_teacher(text);

create or replace function public.gym_register_teacher(
  p_display_name text,
  p_experience text,
  p_age smallint,
  p_body_size text,
  p_gender text,
  p_signup_reason text,
  p_other_activities text,
  p_is_single boolean,
  p_has_children boolean,
  p_favorite_food text,
  p_contact text,
  p_city_or_area text,
  p_certifications text,
  p_availability text,
  p_emergency_contact text,
  p_fun_fact text,
  p_how_heard text,
  p_social_media text,
  p_allergies text,
  p_favorite_exercise text,
  p_years_teaching smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_body text;
  v_id uuid;
begin
  v_name := trim(coalesce(p_display_name, ''));
  if v_name = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_name');
  end if;

  if p_age is null or p_age < 16 or p_age > 99 then
    return jsonb_build_object('ok', false, 'code', 'invalid_age');
  end if;

  if p_years_teaching is null or p_years_teaching < 0 or p_years_teaching > 60 then
    return jsonb_build_object('ok', false, 'code', 'invalid_years_teaching');
  end if;

  v_body := lower(trim(coalesce(p_body_size, '')));
  if v_body not in ('skinny', 'average', 'fat') then
    return jsonb_build_object('ok', false, 'code', 'invalid_body_size');
  end if;

  if trim(coalesce(p_experience, '')) = ''
    or trim(coalesce(p_gender, '')) = ''
    or trim(coalesce(p_signup_reason, '')) = ''
    or trim(coalesce(p_other_activities, '')) = ''
    or p_is_single is null
    or p_has_children is null
    or trim(coalesce(p_favorite_food, '')) = ''
    or trim(coalesce(p_contact, '')) = ''
    or trim(coalesce(p_city_or_area, '')) = ''
    or trim(coalesce(p_certifications, '')) = ''
    or trim(coalesce(p_availability, '')) = ''
    or trim(coalesce(p_emergency_contact, '')) = ''
    or trim(coalesce(p_fun_fact, '')) = ''
    or trim(coalesce(p_how_heard, '')) = ''
    or trim(coalesce(p_social_media, '')) = ''
    or trim(coalesce(p_allergies, '')) = ''
    or trim(coalesce(p_favorite_exercise, '')) = ''
  then
    return jsonb_build_object('ok', false, 'code', 'invalid_profile');
  end if;

  insert into public.gym_teachers (
    display_name,
    experience,
    age,
    body_size,
    gender,
    signup_reason,
    other_activities,
    is_single,
    has_children,
    favorite_food,
    contact,
    city_or_area,
    certifications,
    availability,
    emergency_contact,
    fun_fact,
    how_heard,
    social_media,
    allergies,
    favorite_exercise,
    years_teaching
  )
  values (
    v_name,
    trim(p_experience),
    p_age,
    v_body,
    trim(p_gender),
    trim(p_signup_reason),
    trim(p_other_activities),
    p_is_single,
    p_has_children,
    trim(p_favorite_food),
    trim(p_contact),
    trim(p_city_or_area),
    trim(p_certifications),
    trim(p_availability),
    trim(p_emergency_contact),
    trim(p_fun_fact),
    trim(p_how_heard),
    trim(p_social_media),
    trim(p_allergies),
    trim(p_favorite_exercise),
    p_years_teaching
  )
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'teacher_id', v_id,
    'display_name', v_name
  );
end;
$$;

grant execute on function public.gym_register_teacher(
  text,
  text,
  smallint,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  smallint
) to anon, authenticated;
