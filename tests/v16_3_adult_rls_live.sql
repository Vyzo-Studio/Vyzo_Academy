-- TESTE REAL V16.3: executar somente em transação conjunta com
-- supabase/staging/v16_3_adult_rls_policy_preview.sql; rollback obrigatório.
-- Esta SQL é sintética, não prova autenticação HTTP/idade real.
update academy_internal.registration_gate set enabled=true where singleton=true;
insert into auth.users(
 id,email,aud,role,is_sso_user,is_anonymous,email_confirmed_at,raw_user_meta_data,raw_app_meta_data
) values
 ('a1a1a1a1-1111-4111-8111-111111111111','v163-rls-a@example.invalid','authenticated','authenticated',false,false,now(),
  '{"vyzo_adult_attested":"true"}'::jsonb,'{"academy_adult_verified":true}'::jsonb),
 ('b2b2b2b2-2222-4222-8222-222222222222','v163-rls-b@example.invalid','authenticated','authenticated',false,false,now(),
  '{"vyzo_adult_attested":"true","academy_adult_verified":true}'::jsonb,'{}'::jsonb);
do $guard$
declare n int;
begin
 select count(*) into n from pg_policies
 where schemaname='public' and policyname='academy_verified_adult_guard'
 and permissive='RESTRICTIVE';
 if n<>16 then raise exception 'FAIL: expected 16 restrictive student-data guards; got %',n;end if;
end $guard$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1a1a1a1-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"a1a1a1a1-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false,"app_metadata":{"academy_adult_verified":true}}',true);
insert into public.academy_private_records(user_id,record_key,payload,revision)
values('a1a1a1a1-1111-4111-8111-111111111111','v9_current_state','{"schema":9,"goals":[],"tasks":[],"assessments":[]}'::jsonb,1);
do $ok$
begin
 if (select count(*) from public.academy_private_records)<>1 then
  raise exception 'FAIL: authorized adult cannot read own record';
 end if;
end $ok$;
select set_config('request.jwt.claim.sub','b2b2b2b2-2222-4222-8222-222222222222',true);
select set_config('request.jwt.claims','{"sub":"b2b2b2b2-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":false,"user_metadata":{"academy_adult_verified":true},"app_metadata":{}}',true);
do $denied$
declare fail_closed boolean:=false;
begin
 if exists(select 1 from public.academy_private_records) then
  raise exception 'FAIL: unapproved student read another account';
 end if;
 begin
  insert into public.academy_private_records(user_id,record_key,payload,revision)
  values('b2b2b2b2-2222-4222-8222-222222222222','v9_current_state','{}',1);
 exception when insufficient_privilege then fail_closed:=true;
 end;
 if not fail_closed then raise exception 'FAIL: spoofed user_metadata bypassed adult guard';end if;
end $denied$;
select set_config('request.jwt.claim.sub','a1a1a1a1-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"a1a1a1a1-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false,"app_metadata":{"academy_adult_verified":false}}',true);
do $revoked$
begin
 if exists(select 1 from public.academy_private_records) then
  raise exception 'FAIL: revoked JWT claim still reads a student record';
 end if;
end $revoked$;
reset role;
-- A chamada de teste deve executar rollback imediatamente após este arquivo.
