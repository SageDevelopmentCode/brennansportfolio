alter table public.users add column email text;

update public.users set email = '' where email is null;

alter table public.users alter column email set not null;

create unique index users_email_key on public.users (lower(email));
