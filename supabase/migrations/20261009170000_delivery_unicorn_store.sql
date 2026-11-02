-- Skate Drop: $3000 unicorn in the animal store

insert into public.delivery_animal_prices (mount_id, price)
values ('unicorn', 3000)
on conflict (mount_id) do update set price = excluded.price;
