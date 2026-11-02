-- Iron Desk: teachers, classes, enrollments (no auth — public read, RPC writes)

create table public.gym_teachers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.gym_classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid references public.gym_teachers(id) on delete set null,
  created_at timestamptz not null default now()
);

create index gym_classes_teacher_id_idx on public.gym_classes (teacher_id);

create table public.gym_class_enrollments (
  class_id uuid not null references public.gym_classes(id) on delete cascade,
  child_id uuid not null references public.gym_check_in_children(id) on delete cascade,
  primary key (class_id, child_id)
);

create index gym_class_enrollments_child_id_idx
  on public.gym_class_enrollments (child_id);

alter table public.gym_teachers enable row level security;
alter table public.gym_classes enable row level security;
alter table public.gym_class_enrollments enable row level security;

create policy "Anyone can read gym teachers"
  on public.gym_teachers for select to anon, authenticated using (true);

create policy "Anyone can read gym classes"
  on public.gym_classes for select to anon, authenticated using (true);

create policy "Anyone can read gym class enrollments"
  on public.gym_class_enrollments for select to anon, authenticated using (true);

create or replace function public.gym_child_enrollment_eligible(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gym_check_in_children c
    join public.gym_check_in_requests r on r.id = c.request_id
    where c.id = p_child_id
      and c.ejected_at is null
      and r.status = 'approved'
  );
$$;

create or replace function public.gym_register_teacher(p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_id uuid;
begin
  v_name := trim(coalesce(p_display_name, ''));
  if v_name = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_name');
  end if;

  insert into public.gym_teachers (display_name)
  values (v_name)
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'teacher_id', v_id,
    'display_name', v_name
  );
end;
$$;

create or replace function public.gym_create_class(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_id uuid;
begin
  v_name := trim(coalesce(p_name, ''));
  if v_name = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_name');
  end if;

  insert into public.gym_classes (name)
  values (v_name)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'class_id', v_id, 'name', v_name);
end;
$$;

create or replace function public.gym_assign_class_teacher(
  p_class_id uuid,
  p_teacher_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.gym_classes where id = p_class_id) then
    return jsonb_build_object('ok', false, 'code', 'class_not_found');
  end if;

  if not exists (select 1 from public.gym_teachers where id = p_teacher_id) then
    return jsonb_build_object('ok', false, 'code', 'teacher_not_found');
  end if;

  update public.gym_classes
  set teacher_id = p_teacher_id
  where id = p_class_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.gym_set_class_enrollments(
  p_class_id uuid,
  p_child_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child_id uuid;
begin
  if not exists (select 1 from public.gym_classes where id = p_class_id) then
    return jsonb_build_object('ok', false, 'code', 'class_not_found');
  end if;

  if p_child_ids is not null then
    foreach v_child_id in array p_child_ids
    loop
      if not public.gym_child_enrollment_eligible(v_child_id) then
        return jsonb_build_object('ok', false, 'code', 'invalid_child');
      end if;
    end loop;
  end if;

  delete from public.gym_class_enrollments where class_id = p_class_id;

  if p_child_ids is not null then
    foreach v_child_id in array p_child_ids
    loop
      insert into public.gym_class_enrollments (class_id, child_id)
      values (p_class_id, v_child_id)
      on conflict do nothing;
    end loop;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.gym_register_teacher(text) to anon, authenticated;
grant execute on function public.gym_create_class(text) to anon, authenticated;
grant execute on function public.gym_assign_class_teacher(uuid, uuid) to anon, authenticated;
grant execute on function public.gym_set_class_enrollments(uuid, uuid[]) to anon, authenticated;
