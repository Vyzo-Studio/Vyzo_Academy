-- STAGE 03 - teste em PostgreSQL REAL com identidades simuladas (não valida emails reais).
-- Nenhum estado persiste: todas as inserções e alterações de gate estão na transação.
begin;
do $verify_block$
declare denied boolean:=false;
begin
 begin
  insert into auth.users(id,email,aud,role,is_sso_user,is_anonymous,raw_user_meta_data)
  values('a0a0a0a0-9000-4000-8000-000000000000','stage03-blocked@example.invalid','authenticated','authenticated',false,false,
    '{"vyzo_adult_attested":"true"}'::jsonb);
 exception when sqlstate 'P0001' then denied:=true;
 end;
 if not denied then raise exception 'FAIL: registration gate did not block new accounts'; end if;
end $verify_block$;

-- Abre gate APENAS nesta transação ainda não commitada. Outras conexões seguem bloqueadas.
update academy_internal.registration_gate set enabled=true where singleton=true;
do $verify_age$
declare denied boolean:=false;
begin
 begin
  insert into auth.users(id,email,aud,role,is_sso_user,is_anonymous)
  values('a0a0a0a0-9000-4000-8000-000000000003','stage03-no-attest@example.invalid','authenticated','authenticated',false,false);
 exception when sqlstate 'P0001' then denied:=true;
 end;
 if not denied then raise exception 'FAIL: age attestation was not required'; end if;
end $verify_age$;

insert into auth.users(id,email,aud,role,is_sso_user,is_anonymous,raw_user_meta_data)
values
 ('a0a0a0a0-9000-4000-8000-000000000001','stage03-a@example.invalid','authenticated','authenticated',false,false,'{"vyzo_adult_attested":"true"}'::jsonb),
 ('b0b0b0b0-9000-4000-8000-000000000002','stage03-b@example.invalid','authenticated','authenticated',false,false,'{"vyzo_adult_attested":"true"}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.sub','a0a0a0a0-9000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"a0a0a0a0-9000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
insert into public.academy_private_records(user_id,record_key,payload,revision)
values('a0a0a0a0-9000-4000-8000-000000000001','v9_current_state',
 '{"schema":9,"revision":3,"goals":[{"id":"g-a"}],"assessments":[{"id":"a-a","answers":{"q":2}}],"tasks":[{"id":"t-a"}]}'::jsonb,1);
do $verify_a$
declare n bigint;
begin
 select count(*) into n from public.academy_private_records where record_key='v9_current_state';
 if n<>1 then raise exception 'FAIL: A could not read own cloud data';end if;
end $verify_a$;

-- Simula browser isolado B com mesmo projeto e papel Postgres, mas sessão diferente.
select set_config('request.jwt.claim.sub','b0b0b0b0-9000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"b0b0b0b0-9000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',true);
do $verify_b$
declare n bigint; affected integer; denied boolean:=false;
begin
 select count(*) into n from public.academy_private_records;
 if n<>0 then raise exception 'FAIL: B can see A snapshot';end if;
 update public.academy_private_records set payload='{"schema":9}'::jsonb where user_id='a0a0a0a0-9000-4000-8000-000000000001';
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'FAIL: B changed A snapshot';end if;
 begin
  insert into public.academy_private_records(user_id,record_key,payload)
  values('a0a0a0a0-9000-4000-8000-000000000001','another_state','{}'::jsonb);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'FAIL: B inserted for A';end if;
end $verify_b$;

-- Simula segundo dispositivo de A: sessão independente, JWT A, sem cache do browser anterior.
select set_config('request.jwt.claim.sub','a0a0a0a0-9000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"a0a0a0a0-9000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
do $verify_other_device$
declare result jsonb;
begin
 select payload into result from public.academy_private_records where record_key='v9_current_state';
 if result->'assessments'->0->'answers'->>'q'<>'2' then raise exception 'FAIL: answer not preserved in remote snapshot';end if;
 if result->'tasks'->0->>'id'<>'t-a' then raise exception 'FAIL: plan not preserved';end if;
end $verify_other_device$;

rollback;
select 'PASS: registration blocked by default, adult declaration required, PostgreSQL A/B isolated, cloud snapshot available to A across simulated sessions, rollback' as result;
