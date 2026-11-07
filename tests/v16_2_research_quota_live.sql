-- V16.2 live PostgreSQL test. Run AFTER migration inside the SAME transaction.
-- SQL runner wraps this with BEGIN and ROLLBACK; never keep synthetic users.
update academy_internal.registration_gate set enabled=true where singleton=true;
insert into auth.users(
 id,email,aud,role,is_sso_user,is_anonymous,email_confirmed_at,raw_user_meta_data,raw_app_meta_data
) values
 ('61616161-6161-4161-8161-616161616161','v16testapproved@example.invalid','authenticated','authenticated',false,false,now(),
  '{"vyzo_adult_attested":"true"}'::jsonb,'{"academy_ai_research_allowed":true,"academy_adult_verified":true}'::jsonb),
 ('62626262-6262-4262-8262-626262626262','v16testunapproved@example.invalid','authenticated','authenticated',false,false,now(),
  '{"vyzo_adult_attested":"true"}'::jsonb,'{"academy_ai_research_allowed":true}'::jsonb);
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"61616161-6161-4161-8161-616161616161"}',true);
do $auth$
declare denied boolean:=false;
begin
 begin
  perform public.academy_reserve_research_for_student('61616161-6161-4161-8161-616161616161',8);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'FAIL: client invoked server-only quota';end if;
end $auth$;
reset role;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role","sub":""}',true);
do $srv$
declare id1 uuid;id2 uuid;denied boolean:=false;nr int;
begin
 id1:=public.academy_reserve_research_for_student('61616161-6161-4161-8161-616161616161',8);
 id2:=public.academy_reserve_research_for_student('61616161-6161-4161-8161-616161616161',9);
 if id1=id2 or id1 is null or id2 is null then raise exception 'FAIL: reservations not unique';end if;
 select count(*) into nr from public.academy_research_requests
 where user_id='61616161-6161-4161-8161-616161616161';
 if nr<>2 then raise exception 'FAIL: reservations not saved';end if;
 begin
  perform public.academy_reserve_research_for_student('61616161-6161-4161-8161-616161616161',10);
 exception when sqlstate 'P0001' then denied:=true;end;
 if not denied then raise exception 'FAIL: 2/minute quota bypassed';end if;
 denied:=false;
 begin
  perform public.academy_reserve_research_for_student('62626262-6262-4262-8262-626262626262',12);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'FAIL: unapproved adult was allowed';end if;
end $srv$;
reset role;
-- The caller must execute ROLLBACK and verify that gate/users/records are absent.
