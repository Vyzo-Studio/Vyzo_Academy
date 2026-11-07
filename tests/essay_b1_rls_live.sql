-- B1: executar somente APÓS criar a migração no MESMO begin/rollback.
-- Este arquivo não altera estado permanente; usar com a migração B1 dentro da transação.
update academy_internal.registration_gate set enabled=true where singleton=true;
insert into auth.users(id,email,aud,role,is_sso_user,is_anonymous,email_confirmed_at,raw_user_meta_data,raw_app_meta_data)
values
('a1a1a1a1-4111-4111-8111-000000000001','b1-a@example.invalid','authenticated','authenticated',false,false,now(),'{"vyzo_adult_attested":"true"}'::jsonb,
 '{"academy_ai_essay_allowed":true,"academy_adult_verified":true}'::jsonb),
('b1b1b1b1-4111-4111-8111-000000000002','b1-b@example.invalid','authenticated','authenticated',false,false,now(),'{"vyzo_adult_attested":"true"}'::jsonb,'{}'::jsonb);
set local role authenticated;
select set_config('request.jwt.claim.sub','a1a1a1a1-4111-4111-8111-000000000001',true);
select set_config('request.jwt.claims','{"sub":"a1a1a1a1-4111-4111-8111-000000000001","role":"authenticated","is_anonymous":false}',true);
insert into public.academy_essays(
 id,user_id,title,body,prompt,versions,proposal_id,proposal_version,writing_mode
) values(
 'a1a1a1a1-4111-4111-8111-000000000011','a1a1a1a1-4111-4111-8111-000000000001',
 'Treino B1',
 'A desigualdade digital é um desafio para o Brasil. Muitas famílias ainda enfrentam dificuldades econômicas para acessar serviços educacionais e ferramentas de informação. O poder público deve promover infraestrutura e formação digital em comunidades vulneráveis.',
 'Proposta autoral de treino','[]'::jsonb,'enem-inclusao-digital-2026-a1',1,'treino'
);
do $a$
declare v_id uuid; v_revision timestamptz; v_text text; v_hash text; v_forbidden boolean:=false;
begin
 select updated_at,body into v_revision,v_text from public.academy_essays
 where id='a1a1a1a1-4111-4111-8111-000000000011';
 v_id:=public.academy_reserve_essay_assessment(
  'a1a1a1a1-4111-4111-8111-000000000011',v_revision);
 if v_id is null then raise exception 'FAIL: sem reserva';end if;
 select body_sha256 into v_hash from public.academy_essay_assessments where id=v_id;
 if v_hash is distinct from encode(sha256(convert_to(v_text,'UTF8')),'hex')
 then raise exception 'FAIL: hash do texto inconsistente';end if;
 if (select count(*) from public.academy_essay_assessments where user_id='a1a1a1a1-4111-4111-8111-000000000001')<>1
 then raise exception 'FAIL: reserva não foi persistida';end if;
 begin
  perform public.academy_reserve_essay_assessment('a1a1a1a1-4111-4111-8111-000000000011',v_revision);
 exception when sqlstate 'P0002' then v_forbidden:=true; end;
 if not v_forbidden then raise exception 'FAIL: duplicação não bloqueada';end if;
 v_forbidden:=false;
 begin
  perform public.academy_reserve_essay_assessment('a1a1a1a1-4111-4111-8111-000000000011',v_revision-interval '2 seconds');
 exception when sqlstate 'P0003' then v_forbidden:=true; end;
 if not v_forbidden then raise exception 'FAIL: revisão antiga não bloqueada';end if;
 v_forbidden:=false;
 begin
  update public.academy_essay_assessments set status='completed' where id=v_id;
 exception when insufficient_privilege then v_forbidden:=true; end;
 if not v_forbidden then raise exception 'FAIL: escrita direta permitida';end if;
end $a$;
select set_config('request.jwt.claim.sub','b1b1b1b1-4111-4111-8111-000000000002',true);
select set_config('request.jwt.claims','{"sub":"b1b1b1b1-4111-4111-8111-000000000002","role":"authenticated","is_anonymous":false}',true);
do $b$
declare v_denied boolean:=false;
begin
 if (select count(*) from public.academy_essay_assessments)<>0
 then raise exception 'FAIL: estudante B pode ler avaliação de A';end if;
 begin
  perform public.academy_reserve_essay_assessment(
   'a1a1a1a1-4111-4111-8111-000000000011',now());
 exception when insufficient_privilege then v_denied:=true; end;
 if not v_denied then raise exception 'FAIL: estudante B consegue reservar redação de A';end if;
end $b$;
reset role;
-- O chamador deve executar rollback ao final.
