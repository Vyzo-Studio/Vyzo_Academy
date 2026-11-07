# VYZO ACADEMY — ETAPA 03: CONTAS, AUTENTICAÇÃO E SINCRONIZAÇÃO

**Data:** 07/11/2026  
**Status:** implementação em branch de homologação, **não liberada a estudantes nem pronta para produção**.  
**Destino verificado:** Supabase conexão `Vyzo_academy`, projeto `cfrlqinzsysoqcduqftd`, região `sa-east-1`. Nunca reutilizar banco de cliente.

## Banco real — alterações já aplicadas

A migração `supabase/migrations/202611070003_stage03_registration_gate.sql` foi aplicada via fluxo de migrações Supabase como `stage03_registration_gate` (versão remota `20261107053909`).

- Schema interno `academy_internal`, fechado para `anon` e `authenticated`.
- `academy_internal.registration_gate.enabled=false` por padrão; gatilho no servidor `auth.users` recusa **novas inscrições**, inclusive anônimas, até homologação explícita.
- Quando futuramente liberadas inscrições de adultos, o gatilho exige declaração `vyzo_adult_attested=true`; isso é **autodeclaração, NÃO verificação de idade**. Não é suficiente para abrir contas infantis.
- E-mails vazios também são rejeitados. Essa proteção vale independentemente de JavaScript público.
- O cadastro segue bloqueado na configuração pública (`registrationEnabled:false`) e no banco; **não habilitar unilateralmente**.
- As cinco migrações da Etapa 02 continuam presentes; 20 tabelas Academy com RLS e titularidade. Não foram feitas migrações destrutivas.

## Implementação em GitHub — escopo da branch

- `academy/config.js`: somente URL e **chave publishable** do projeto correto; **nenhuma service-role ou secret**. A main de produção permanece inalterada até homologação.
- `academy/app.mjs`: reaproveita Supabase Auth real da V8 para cadastro (ainda fechado), confirmação, login, recuperação, persistência de sessão, logout, edição de perfil, onboarding → objetivos → diagnósticos → planos. `getUser()` revalida identidade; troca de conta/sair limpa estados em memória para não expor dados privados.
- `academy/v12-auth-core.mjs`: valida usuário verificado e formatos locais, bloqueia campos com credenciais, importa somente com consentimento e hash SHA-256 contra duplicação.
- `academy/cloud-snapshot.mjs` e `academy/account-import.mjs`: importação voluntária das chaves `enem-intelligence-v2`, `enem-intelligence-v1` e `vyzo-academy-v9-guest-1`; guardam cópia integral em `academy_legacy_imports` e snapshots ativos em `academy_private_records` (um por usuário + origem), **sem sobrescrever progresso remoto preexistente**. Exportação do arquivo histórico privado pelo titular.
- `academy/v9-cloud.html` + `academy/v9-cloud-gate.mjs`: nova rota de V9 autenticada; só carrega a jornada após `auth.getUser()` com e-mail confirmado. Puxa o snapshot privado e sincroniza alterações por revisão condicional (CAS), cache `localStorage` separado por UUID de aluno e conflito de gravação detectado. Os dados são protegidos por RLS, não por esconder HTML no GitHub Pages.
- `academy/v9.mjs`: chave original guest e schema V9 permanecem compatíveis; o modo local `academy/v9.html` permanece acessível e **não transmite dados sem consentimento**.
- **Alcance real da sincronização:** V8 (objetivos, diagnósticos, planos/tarefas e redações) já utiliza tabelas PostgreSQL; V9 cloud usa snapshot automático com controle de revisão; simulador clássico V1/V2 **não ganhou salvamento contínuo**, apenas importação e recuperação de snapshot íntegro, preservando respostas, histórico, redação e IDs usados. Não anunciar sincronização automática do clássico.

## Segurança e privacidade

- `SELECT/INSERT/UPDATE/DELETE` privados continuam controlados pelo servidor com `auth.uid()` e RLS; dados do aluno B não podem ser lidos como A.
- Tokens JWT e dados de conta **não** são persistidos nos backups de estudo; tokens de sessão são geridos por Supabase Auth. Não confiar em `user_metadata` como autorização RLS.
- Inscrições para menores de idade seguem **bloqueadas** até validação legal de consentimento e idade/guardiões. A existência de tabelas `academy_guardian_permissions` fechadas não equivale a consentimento homologado.
- O modo V9 guest continua sem sincronizar; usuário deve escolher arquivo/origem e autorizar a associação ao **e-mail da conta ativa**.
- GitHub Pages não fornece autenticação HTTP da página estática: a segurança de acesso a dados privados depende de Supabase Auth + RLS verificada, não de ocultar JavaScript.
- O módulo cliente usa versão fixada de Supabase JS por CDN; ainda precisa de política de dependências/CSP para produção.
- A fila V9 protege conflitos CAS e mantém cópia local, mas requer teste com falhas de conexão, limites de armazenamento e concorrência reais antes de lançamento.

## Testes

### Executados de verdade no banco dedicado

- `tests/stage03_cloud_rls_live.sql` — **PASS**: novas inscrições rejeitadas no estado normal, autodeclaração etária exigida quando gate temporariamente aberto *dentro da transação*, registros A/B privados, respostas e tarefas do snapshot acessíveis numa segunda sessão **simulada** com mesmo JWT de A. `ROLLBACK` no fim, gate segue fechado.
- `tests/stage02_rls_live.sql` — **PASS** após ajuste para teste transacional com gate (isolation A/B, ownership, FKs e anônimo).
- `tests/stage02_nested_integrity_live.sql` — **PASS** após ajuste (CRUD próprio e coerência entre meta e sessão).
- Checagem real pós-teste: `auth.users=0`, `academy_legacy_imports=0`, `academy_private_records=0`, `registration_gate.enabled=false`, `20` tabelas Academy com RLS.
- Supabase Security Advisor: 3 avisos informativos de tabelas internas intencionalmente sem policies; Performance Advisor: índices ainda não utilizados no banco vazio.

### Testes automatizados preparados na branch

- `tests/stage03_auth.test.mjs` — testes de importação e isolamento em **mocks**, com repetição idempotente, pertencimento à conta e verificação de arquivos.
- Workflow `Quality checks` inclui `node --check` nos módulos novos e regressão anterior do site.
- **Mocks não comprovam autenticação HTTP real.**

### Obrigatórios ainda não realizados — bloqueadores de produção

1. **Criar e confirmar duas contas realmente distintas** em um ambiente de homologação devidamente autorizado, com e-mails que possam ser recebidos; testar cadastro, confirmação, login, recuperação real, sessão persistente e logout. Não foram criadas duas contas reais neste atendimento.
2. Confirmar em Supabase Dashboard as configurações Auth: Email/Password, Confirm email habilitado, proteção contra abuso, políticas de senha e remetente de e-mail; configurar e testar SMTP adequado e `Site URL`/`Redirect URLs` exatos: `https://vyzo-studio.github.io/Vyzo_Academy/academy/`. Mudanças de e-mail e recuperação devem ser exercitadas por links reais.
3. Verificar sincronização entre dois navegadores/perfis realmente isolados com os dois usuários reais, incluindo upload e download V9 e restauração do clássico. O teste PostgreSQL de duas sessões foi **simulado por claims**, não prova login/dispositivos reais.
4. Auditoria de idade mínima, LGPD e medidas de proteção de dados de estudantes e responsáveis. Não habilitar cadastro infantil nem publicidade para menores enquanto pendente.
5. Fazer QA end-to-end do CDN, rede, callback de recuperação e concorrência, e aprovar a implantação antes de mudar o gate e `registrationEnabled`.

## Critério final

**Etapa 03 NÃO pode ser declarada em produção** enquanto os bloqueadores acima não forem resolvidos. O projeto segue com cadastro fechado, e o código deve permanecer em PR draft de homologação. Não ativar interface pública de contas infantis; não alterar os clientes Haus, GNG ou Santomen.

Documentação técnica anterior: [STAGE02_SUPABASE_BACKEND_REPORT.md](STAGE02_SUPABASE_BACKEND_REPORT.md).
