-- VYZO ACADEMY B1 — avaliações imutáveis por revisão, sem liberar IA nem cadastro.
-- Dependências: migrações da Etapa A + Auth Stage03 em homologação.
-- Somente o Supabase EXCLUSIVO da VYZO ACADEMY deverá receber esta migração.
create table if not exists public.academy_essay_assessments(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 essay_id uuid not null,
 essay_revision timestamptz not null,
 proposal_id text not null,
 proposal_version integer not null check(proposal_version>=1),
 rubric_id text not null,
 essay_snapshot text not null,
 body_sha256 text not null check(body_sha256 ~ '^[a-f0-9]{64}$'),
 status text not null default 'reserved'
  check(status in ('reserved','completed','provider_error','invalid_output','timeout')),
 report jsonb,
 provider_model text,
 input_tokens integer not null default 0 check(input_tokens>=0),
 output_tokens integer not null default 0 check(output_tokens>=0),
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 constraint academy_assessment_essay_owner_fk
  foreign key(essay_id,user_id) references public.academy_essays(id,user_id),
 constraint academy_assessment_report_when_complete
  check((status='completed' and report is not null) or (status<>'completed' and report is null))
);
create unique index if not exists academy_assessment_one_active_per_revision
 on public.academy_essay_assessments(user_id,essay_id,essay_revision)
 where status in ('reserved','completed');
create index if not exists academy_assessment_user_created_idx
 on public.academy_essay_assessments(user_id,created_at desc);
alter table public.academy_essay_assessments enable row level security;
revoke all on public.academy_essay_assessments from public,anon,authenticated;
grant select on public.academy_essay_assessments to authenticated;
drop policy if exists academy_assessment_select_own on public.academy_essay_assessments;
create policy academy_assessment_select_own on public.academy_essay_assessments
 for select to authenticated
 using (user_id=(select auth.uid()) and
  ((select auth.jwt())->>'is_anonymous') is distinct from 'true');
-- Sem INSERT/UPDATE/DELETE pelo navegador; alterações exclusivamente servidor/RPC.
-- Falhas de provedor registradas SEM armazenar resposta crua, e sem modificar academy_essays.

create or replace function public.academy_reserve_essay_assessment(
 p_essay_id uuid,p_revision timestamptz
) returns uuid
language plpgsql security definer
set search_path=pg_catalog,pg_temp
as $reserve$
declare
 v_user uuid:=(select auth.uid());
 v_essay public.academy_essays%rowtype;
 v_assessment uuid;
 v_count integer;
 v_start timestamptz:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
begin
 if v_user is null or not exists(
  select 1 from auth.users u where u.id=v_user
  and u.email_confirmed_at is not null
  and not coalesce(u.is_anonymous,false)
  -- Gate duplo sob CONTROLE ADMINISTRATIVO; autodeclaração não basta.
  and u.raw_app_meta_data->>'academy_ai_essay_allowed'='true'
  and u.raw_app_meta_data->>'academy_adult_verified'='true'
 ) then
  raise exception 'Correção não autorizada para esta conta.' using errcode='42501';
 end if;
 if p_essay_id is null or p_revision is null then
  raise exception 'Identificador ou revisão ausente.' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text,20261108));
 select * into v_essay from public.academy_essays
  where id=p_essay_id and user_id=v_user for share;
 if not found then
  raise exception 'Redação privada não encontrada.' using errcode='42501';
 end if;
 if v_essay.updated_at is distinct from p_revision then
  raise exception 'Revisão alterada, salve novamente.' using errcode='P0003';
 end if;
 if v_essay.proposal_id is distinct from 'enem-inclusao-digital-2026-a1'
  or v_essay.proposal_version is distinct from 1 then
  raise exception 'Esta proposta não está habilitada para a rubrica ENEM.' using errcode='22023';
 end if;
 -- O modo simulado só poderá ser avaliado após o protocolo de entrega da B2.
 if v_essay.writing_mode='simulado' then
  raise exception 'Simulado aguardando confirmação de entrega.' using errcode='42501';
 end if;
 if v_essay.writing_mode is distinct from 'treino' or
   char_length(btrim(v_essay.body))<80 or
   (select count(*) from regexp_split_to_table(btrim(v_essay.body),'\s+') as word)<20 or
   char_length(v_essay.body)>50000 then
  raise exception 'Texto insuficiente ou inválido.' using errcode='22023';
 end if;
 update public.academy_essay_assessments
   set status='timeout',completed_at=now()
   where user_id=v_user and essay_id=p_essay_id
     and status='reserved' and created_at<now()-interval '3 minutes';
 if exists(select 1 from public.academy_essay_assessments
   where user_id=v_user and essay_id=p_essay_id and essay_revision=p_revision
   and status in ('reserved','completed')) then
  raise exception 'Correção já reservada ou concluída para esta revisão.' using errcode='P0002';
 end if;
 select count(*) into v_count from public.academy_essay_assessments
   where user_id=v_user and created_at>=v_start;
 if v_count>=3 then raise exception 'Limite diário de redações alcançado.' using errcode='P0001';end if;
 select count(*) into v_count from public.academy_essay_assessments
   where user_id=v_user and created_at>=now()-interval '60 seconds';
 if v_count>=1 then raise exception 'Aguarde antes de solicitar nova correção.' using errcode='P0001';end if;
 insert into public.academy_essay_assessments(
  user_id,essay_id,essay_revision,proposal_id,proposal_version,rubric_id,
  essay_snapshot,body_sha256,status
 ) values(
  v_user,p_essay_id,v_essay.updated_at,v_essay.proposal_id,v_essay.proposal_version,
  'enem-cartilha-2026',v_essay.body,
  encode(pg_catalog.sha256(convert_to(v_essay.body,'UTF8')),'hex'),'reserved'
 ) returning id into v_assessment;
 return v_assessment;
end;
$reserve$;
revoke all on function public.academy_reserve_essay_assessment(uuid,timestamptz)
 from public,anon;
grant execute on function public.academy_reserve_essay_assessment(uuid,timestamptz)
 to authenticated;
comment on table public.academy_essay_assessments is
 'Avaliações privadas associadas ao texto EXATO, revisão e autor; proíbe mudanças pelo cliente.';
comment on function public.academy_reserve_essay_assessment(uuid,timestamptz) is
 'Reserva atômica 3/dia 1/min. Exige JWT confirmado, dois app_metadata administrados, edição própria, revisão exata; sem cadastro público.';
