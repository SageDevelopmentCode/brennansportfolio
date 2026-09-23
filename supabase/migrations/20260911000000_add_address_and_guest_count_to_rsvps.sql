alter table public.rsvps
  add column address text not null default '',
  add column guest_count integer not null default 0;

update public.rsvps
set address = 'Not provided'
where char_length(trim(address)) = 0;

alter table public.rsvps
  add constraint rsvps_address_not_blank check (char_length(trim(address)) > 0),
  add constraint rsvps_guest_count_non_negative check (guest_count >= 0);

alter table public.rsvps alter column address drop default;
