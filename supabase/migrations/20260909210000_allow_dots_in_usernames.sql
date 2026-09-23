alter table public.users drop constraint users_username_format;

alter table public.users add constraint users_username_format
  check (username ~ '^[a-z0-9_.]{3,20}$');
