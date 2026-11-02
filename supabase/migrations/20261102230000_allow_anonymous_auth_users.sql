-- Anonymous sign-in creates auth.users without signup username metadata.
-- Skip public.users profile row for anonymous users (Squad Ping and similar).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_username text;
begin
  if coalesce(new.is_anonymous, false)
    or coalesce(new.raw_app_meta_data->>'provider', '') = 'anonymous' then
    return new;
  end if;

  profile_username := lower(trim(new.raw_user_meta_data->>'username'));

  if profile_username is null or profile_username = '' then
    raise exception 'Username is required';
  end if;

  insert into public.users (id, username, email)
  values (new.id, profile_username, lower(new.email));

  return new;
end;
$$;
