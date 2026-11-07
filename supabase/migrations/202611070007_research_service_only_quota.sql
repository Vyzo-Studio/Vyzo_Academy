-- V16.2 — Segurança da pesquisa V10: quota reservada apenas pelo servidor.
-- Pré-requisito: bloco 02/A já instalado; aplicar somente junto ao gateway novo.
-- Nunca habilita custos, contas, menores, cadastro ou altera dados existentes.
-- Política: JWT do estudante é validado via /auth/v1/user NO gateway, que usa a
-- service_role privada para esta chamada RPC depois da autorização.
-- Não instalar esta migração enquanto a Edge Function antiga estiver em uso.

create or replace function public.academy_reserve_research_for_student(
 p_user_id uuid, p_query_length integer
) returns uuid
language plpgsql security definer
set search_path=pg_catalog,pg_temp
as $reserve$
declare
 v_count integer;
 v_key uuid;
 v_start timestamptz:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
begin
 if (select auth.jwt()->>'role') is distinct from 'service_role' then
  raise exception 'Operação reservada ao backend.' using errcode='42501';
 end if;
 if p_user_id is null or p_query_length is null or p_query_length not between 3 and 150 then
  raise exception 'Parâmetros de pesquisa inválidos.' using errcode='22023';
 end if;
 if not exists(
  select 1 from auth.users u
  where u.id=p_user_id and u.email_confirmed_at is not null
   and not coalesce(u.is_anonymous,false)
   and u.raw_app_meta_data->>'academy_ai_research_allowed'='true'
   and u.raw_app_meta_data->>'academy_adult_verified'='true'
 ) then
  raise exception 'Pesquisa não autorizada para a conta.' using errcode='42501';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(p_user_id::text,20261107)
 );
 select count(*) into v_count from public.academy_research_requests r
  where r.user_id=p_user_id and r.created_at>=v_start;
 if v_count>=6 then
  raise exception 'Limite diário de pesquisa.' using errcode='P0001';
 end if;
 select count(*) into v_count from public.academy_research_requests r
  where r.user_id=p_user_id and r.created_at>=now()-interval '60 seconds';
 if v_count>=2 then
  raise exception 'Aguarde entre as pesquisas.' using errcode='P0001';
 end if;
 insert into public.academy_research_requests(user_id,query_length,status)
 values(p_user_id,p_query_length,'reserved') returning id into v_key;
 return v_key;
end
$reserve$;

-- A função antiga é uma RPC SECURITY DEFINER intencional no schema público,
-- mas não deve permanecer acessível a estudantes; ela é substituída no gateway.
revoke all on function public.academy_reserve_research(integer)
 from public,anon,authenticated;
revoke all on function public.academy_reserve_research_for_student(uuid,integer)
 from public,anon,authenticated;
grant execute on function public.academy_reserve_research_for_student(uuid,integer)
 to service_role;

comment on function public.academy_reserve_research_for_student(uuid,integer) is
 'Quota atômica por estudante e admissão adulta administrativa. Somente Edge Function autenticada chama via service_role; 6/dia, 2/min. Não armazena a consulta.';
comment on function public.academy_reserve_research(integer) is
 'Legada e indisponível ao authenticated. Revogar o acesso antes de liberar nova Edge Function.';
