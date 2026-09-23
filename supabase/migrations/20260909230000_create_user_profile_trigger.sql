create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_username text;
begin
  profile_username := lower(trim(new.raw_user_meta_data->>'username'));

  if profile_username is null or profile_username = '' then
    raise exception 'Username is required';
  end if;

  insert into public.users (id, username, email)
  values (new.id, profile_username, lower(new.email));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.auto_confirm_user_email()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_auto_confirm
  after insert on auth.users
  for each row execute function public.auto_confirm_user_email();
