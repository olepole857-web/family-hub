-- FAMILY HUB: Nach Anlage der Benutzer in Supabase SQL Editor ausführen.
-- E-Mail-Adressen hier nur direkt im SQL-Editor ersetzen, NICHT ins öffentliche GitHub hochladen.
insert into public.families(name,owner_id)
select 'Unsere Familie', u.id
from auth.users u
where lower(u.email)=lower('DEINE_EMAIL@BEISPIEL.DE')
and not exists(select 1 from public.families f where f.owner_id=u.id);

with owner_family as (
select f.id from public.families f
join auth.users owner on owner.id=f.owner_id
where lower(owner.email)=lower('DEINE_EMAIL@BEISPIEL.DE')
order by f.created_at desc limit 1
)
insert into public.family_members(family_id,user_id,display_name)
select f.id,u.id,split_part(u.email,'@',1) from owner_family f
join auth.users u on lower(u.email) in (
lower('DEINE_EMAIL@BEISPIEL.DE'),lower('PERSON2@BEISPIEL.DE'),
lower('PERSON3@BEISPIEL.DE'),lower('PERSON4@BEISPIEL.DE'),
lower('PERSON5@BEISPIEL.DE'),lower('PERSON6@BEISPIEL.DE'))
on conflict(user_id) do nothing;