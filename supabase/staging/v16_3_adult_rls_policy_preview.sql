-- V16.3 / PROPOSTA DE HOMOLOGAÇÃO: NÃO APLICAR PERMANENTEMENTE.
-- Exige revisão de Auth, refresh/revogação de JWT, backup recuperável e duas contas reais.
-- Restringe os dados de alunos à aprovação administrativa em app_metadata.
-- É uma camada ADICIONAL: as RLS existentes por user_id continuam necessárias.
-- A claim JWT pode ficar desatualizada até refresh/expiração; NÃO é revogação instantânea.
do $guard$
declare
 table_name text;
 names text[]:=array[
  'academy_activity_history','academy_assessment_answers',
  'academy_assessment_sessions','academy_diagnostics','academy_essays',
  'academy_goal_subjects','academy_goals','academy_legacy_imports',
  'academy_plan_tasks','academy_private_records','academy_profiles',
  'academy_research_requests','academy_revision_items','academy_study_plans',
  'academy_study_sessions','academy_study_tasks'
 ];
begin
 foreach table_name in array names loop
  if not exists(
   select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname=table_name and c.relrowsecurity
  ) then
   raise exception 'RLS ausente: %',table_name;
  end if;
  if not exists(
   select 1 from pg_policies p
   where p.schemaname='public' and p.tablename=table_name
    and p.policyname='academy_verified_adult_guard'
  ) then
   execute format(
    'create policy academy_verified_adult_guard on public.%I as restrictive for all to authenticated
     using ((auth.jwt()->''app_metadata''->>''academy_adult_verified'')=''true'')
     with check ((auth.jwt()->''app_metadata''->>''academy_adult_verified'')=''true'')',
    table_name
   );
  end if;
 end loop;
end $guard$;
-- NUNCA usa user_metadata para autorizar acesso.
-- Não habilita registro público, não altera SQL pré-existente de posse, não cria usuários.
