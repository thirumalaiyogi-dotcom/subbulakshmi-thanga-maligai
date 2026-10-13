-- =====================================================================
-- Grant the ADMIN role — run by the project owner in the Supabase
-- dashboard SQL Editor (runs with owner privileges). There is no button
-- or API in the app that can do this: the user_roles table has no write
-- permission for app users, so nobody can make themselves an admin.
--
-- 1. The person first registers in the customer app (or Auth → Users → Add user).
-- 2. Replace the email below, then run.
-- =====================================================================
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = lower('OWNER-EMAIL@example.com')
on conflict do nothing;

-- Check:
select u.email, r.role, r.created_at
from public.user_roles r join auth.users u on u.id = r.user_id
order by r.created_at;

-- Staff (can view and update orders, cannot edit the catalogue):
-- insert into public.user_roles (user_id, role) select id, 'staff' from auth.users where email = lower('STAFF-EMAIL@example.com') on conflict do nothing;

-- Remove a role:
-- delete from public.user_roles where role = 'admin' and user_id = (select id from auth.users where email = lower('PERSON@example.com'));
