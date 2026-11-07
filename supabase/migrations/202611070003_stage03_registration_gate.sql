-- STAGE 03 - Novo projeto dedicado Vyzo_academy exclusivamente.
-- Inscrições públicas permanecem BLOQUEADAS até e-mail, privacidade e proteção de menores serem homologados.
create schema if not exists academy_internal;
revoke all on schema academy_internal from public, anon, authenticated;

create table if not exists academy_internal.registration_gate(
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 changed_at timestamptz not null default now()
);
insert into academy_internal.registration_gate(singleton,enabled) values(true,false)
 on conflict (singleton) do nothing;
revoke all on academy_internal.registration_gate from public, anon, authenticated;

create or replace function academy_internal.guard_signup()
 returns trigger language plpgsql security definer set search_path=pg_catalog as $$
declare is_open boolean;
begin
 -- Supabase anonymous sessions count as 'authenticated': ban them as real study profiles.
 if coalesce(new.is_anonymous,false) then
  raise exception 'VYZO ACADEMY: cadastro anônimo desativado' using errcode='P0001';
 end if;
 if new.email is null or btrim(new.email)='' then
  raise exception 'VYZO ACADEMY: somente cadastro por email' using errcode='P0001';
 end if;
 if coalesce(new.raw_user_meta_data->>'vyzo_adult_attested','') <> 'true' then
  raise exception 'VYZO ACADEMY: somente maiores de 18 anos; inscrição infantil bloqueada' using errcode='P0001';
 end if;
 select enabled into is_open from academy_internal.registration_gate where singleton=true;
 if coalesce(is_open,false) is not true then
  raise exception 'VYZO ACADEMY: novas inscrições ainda não homologadas' using errcode='P0001';
 end if;
 return new;
end $$;
revoke all on function academy_internal.guard_signup() from public, anon, authenticated;
drop trigger if exists academy_guard_signup on auth.users;
create trigger academy_guard_signup before insert on auth.users
 for each row execute function academy_internal.guard_signup();

comment on table academy_internal.registration_gate is
 'Fail-closed. Só habilitar após confirmar email/Site URL/SMTP, revisar privacidade e homologar contas 18+. Não usar para menores.';
