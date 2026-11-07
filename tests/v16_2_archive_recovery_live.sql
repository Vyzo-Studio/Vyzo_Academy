-- V16.2 — ensaio de recuperação lógica dentro do Supabase exclusivo.
-- Dados sintéticos e alteração do gate ocorrem exclusivamente nesta transação.
-- NÃO representa pg_dump/pg_restore completo nem substitui backups da produção.
begin;
update academy_internal.registration_gate set enabled=true where singleton=true;
insert into auth.users(id,email,aud,role,is_sso_user,is_anonymous,email_confirmed_at,raw_user_meta_data,raw_app_meta_data)
values
 ('71717171-7171-4171-8171-717171717171','v16-recovery-a@example.invalid','authenticated','authenticated',false,false,now(),'{"vyzo_adult_attested":"true"}','{"academy_adult_verified":true}'),
 ('72727272-7272-4272-8272-727272727272','v16-recovery-b@example.invalid','authenticated','authenticated',false,false,now(),'{"vyzo_adult_attested":"true"}','{"academy_adult_verified":true}');
set local role authenticated;
select set_config('request.jwt.claim.sub','71717171-7171-4171-8171-717171717171',true);
select set_config('request.jwt.claims','{"sub":"71717171-7171-4171-8171-717171717171","role":"authenticated","is_anonymous":false}',true);
insert into public.academy_legacy_imports(user_id,source_key,fingerprint,original_state)
values(
 '71717171-7171-4171-8171-717171717171','vyzo-academy-v9-guest-1',
 repeat('a',64),
 '{"schema":9,"revision":4,"goals":[{"id":"meta-1","name":"ENEM"}],"assessments":[{"id":"simulado-1","answers":{"q1":2}}],"tasks":[{"id":"tarefa-1"}],"draft":{"name":"rascunho preservado"}}'::jsonb
);
insert into public.academy_private_records(user_id,record_key,payload,revision)
select user_id,'v9_current_state',original_state,4
from public.academy_legacy_imports
where user_id='71717171-7171-4171-8171-717171717171';
do $verify_a$
declare a jsonb;
begin
 select payload into a from public.academy_private_records where record_key='v9_current_state';
 if a->'assessments'->0->>'id' is distinct from 'simulado-1'
  or a->'draft'->>'name' is distinct from 'rascunho preservado'
  or a->'goals'->0->>'id' is distinct from 'meta-1'
 then raise exception 'FAIL: copy changed assessment, draft or goal IDs';end if;
end $verify_a$;
select set_config('request.jwt.claim.sub','72727272-7272-4272-8272-727272727272',true);
select set_config('request.jwt.claims','{"sub":"72727272-7272-4272-8272-727272727272","role":"authenticated","is_anonymous":false}',true);
do $verify_b$
declare denied boolean:=false;
begin
 if exists(select 1 from public.academy_legacy_imports)
  or exists(select 1 from public.academy_private_records) then
  raise exception 'FAIL: student B can see A data';end if;
 begin
  update public.academy_private_records set payload='{"compromised":true}'::jsonb
  where user_id='71717171-7171-4171-8171-717171717171';
 exception when insufficient_privilege then denied:=true;end;
 if exists(select 1 from public.academy_private_records) then
  raise exception 'FAIL: B can see archive after write attempt';end if;
end $verify_b$;
reset role;
do $restore$
declare before_delete jsonb;after_restore jsonb;original_hash text;restored_hash text;preserved boolean:=false;
begin
 select payload into before_delete from public.academy_private_records
 where user_id='71717171-7171-4171-8171-717171717171' and record_key='v9_current_state';
 original_hash:=encode(sha256(convert_to(before_delete::text,'UTF8')),'hex');
 delete from public.academy_private_records
 where user_id='71717171-7171-4171-8171-717171717171' and record_key='v9_current_state';
 if exists(select 1 from public.academy_private_records where user_id='71717171-7171-4171-8171-717171717171')
 then raise exception 'FAIL: synthetic deletion failed';end if;
 -- Restore from the separate archived copy; only simulates an authorized restore operator.
 insert into public.academy_private_records(user_id,record_key,payload,revision)
 select user_id,'v9_current_state',original_state,5
 from public.academy_legacy_imports
 where user_id='71717171-7171-4171-8171-717171717171'
 and source_key='vyzo-academy-v9-guest-1';
 select payload into after_restore from public.academy_private_records
 where user_id='71717171-7171-4171-8171-717171717171' and record_key='v9_current_state';
 restored_hash:=encode(sha256(convert_to(after_restore::text,'UTF8')),'hex');
 if original_hash<>restored_hash or before_delete is distinct from after_restore then
  raise exception 'FAIL: restore payload differs from original';end if;
 if (select revision from public.academy_private_records
  where user_id='71717171-7171-4171-8171-717171717171'
  and record_key='v9_current_state')<>5 then
  raise exception 'FAIL: restore revision not advanced';end if;
 begin
  insert into public.academy_private_records(user_id,record_key,payload,revision)
  values('71717171-7171-4171-8171-717171717171','v9_current_state','{}',1);
 exception when unique_violation then preserved:=true;end;
 if not preserved then raise exception 'FAIL: duplicated restore overwrote existing state';end if;
end $restore$;
rollback;
select 'PASS V16.2 — synthetic archive A, isolation B, delete/recover and SHA256 roundtrip; all ROLLBACK' as result;
