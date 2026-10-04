begin;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'one@example.test', '', now(), '{}', '{"display_name":"User One","is_tenant":true}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'two@example.test', '', now(), '{}', '{"display_name":"User Two","is_landlord":true}', now(), now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select results_eq('select count(*)::bigint from public.profiles', array[1::bigint], 'a user reads only their profile');
select results_eq($$select display_name from public.profiles where user_id = '10000000-0000-0000-0000-000000000002'$$, array[]::text[], 'another profile is hidden');
select lives_ok($$update public.profiles set display_name = 'Updated User' where user_id = '10000000-0000-0000-0000-000000000001'$$, 'a user updates permitted own fields');
select results_eq($$select count(*)::bigint from public.profiles where display_name = 'Updated User'$$, array[1::bigint], 'own update persisted');
select lives_ok($$update public.profiles set display_name = 'Not Allowed' where user_id = '10000000-0000-0000-0000-000000000002'$$, 'cross-user update reveals no row');
select results_eq($$select count(*)::bigint from public.agency_staff$$, array[0::bigint], 'normal user has no staff membership');
select throws_ok($$insert into public.agency_staff (user_id, staff_role) values ('10000000-0000-0000-0000-000000000001', 'reviewer')$$, '42501', null, 'normal user cannot grant staff membership');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{}', true);
select results_eq('select count(*)::bigint from public.profiles', array[0::bigint], 'signed-out requests cannot read profiles');

select * from finish();
rollback;
