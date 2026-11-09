# V16.2 — Checkpoint do lote A1 — Auth pré-produção

**Estado:** implementação isolada, sem cadastro público, sem cliente Supabase configurado e sem implantação. Supabase exclusivo continua como dependência homologável. A branch preserva funcionalidades V9 recentes.

### Evidências
- `academy/app.mjs`: adaptado do PR #8 sobre base idêntica da main.
- `academy/v9.mjs`: somente hooks de armazenamento de conta e envio por revisão; acervo ENEM e UX atuais preservados.
- `academy/v9-cloud.html`: navegação móvel acessível da main, import do gate após `auth.getUser`.
- `academy/v12-auth-core.mjs`: acesso privado exige `app_metadata.academy_adult_verified=true`; autodeclaração não basta.
- `academy/config.js`: URL e chave vazias; cadastro false.
- `tests/stage03_auth.test.mjs` e workflow `stage03-preproduction.yml`: mocks de importação, idempotência e negação, verificações de syntax e gate público bloqueado.

### Impedimentos
Não criar usuários sem autorização. `auth.users=0` no snapshot anterior. O backend Stage03 de cadastro continua fechado. RLS/http, configuração SMTP, e-mail real, teste multiusuário, backup/restauração e proteção de menores ainda exigem homologação externa. `tests/v16_release_security_gate.test.mjs` deve falhar na branch de estágio; se ficar verde, o isolamento de release foi quebrado.

### Próxima subetapa elegível
Revisar função privilegiada de pesquisa e permissões da IA no PR #10, mantendo execução real desabilitada e sem despesas.


### Ensaio autenticado REAL preparado (não executado)
`tests/v16_2_auth_e2e_existing_users.mjs` executa **somente após** `ACADEMY_REAL_AUTH_TEST_APPROVED=YES` e credenciais temporárias de **duas contas adultas já existentes e homologadas** em variáveis de ambiente (`ACADEMY_TEST_SUPABASE_URL`, `ACADEMY_TEST_PUBLISHABLE_KEY`, `ACADEMY_TEST_A_EMAIL/PASSWORD`, `ACADEMY_TEST_B_EMAIL/PASSWORD`). Não cria usuários nem altera registros de estudo; faz login, verifica e-mail e `app_metadata.academy_adult_verified`, exige registros privados preexistentes, compara leituras A/B e tenta logout. Sem contas/dados, termina como `SKIP` ou `INCONCLUSIVO`, nunca como validação de produção.

## V16.3 — Proteção do cache V9 por conta (09/11/2026)

- `academy/v9-cloud-recovery.mjs` valida a decisão de preservar/substituir e impede que a atualização de outra aba sobrescreva silenciosamente o cache.
- `academy/v9-cloud-gate.mjs` pausa quando há versões diferentes, oferece download da versão local antes de liberar a decisão, reconfirma a conta autorizada e guarda uma cópia em chave distinta antes de aplicar o remoto.
- Falha de armazenamento, mudança da aba, backup duplicado ou troca de identidade bloqueiam a operação sem apagar a versão local.
- `tests/v16_3_cloud_recovery.test.mjs` validou situações sintéticas; workflow de **pré-produção** `stage03-preproduction.yml` passou. Sem E2E de contas reais e sem liberação de cadastro.

## V16.3 — Revisão do bloqueio RLS de conta adulta (09/11/2026)

- Constatado no Supabase exclusivo que as policies atuais das tabelas privadas conferem titularidade via `auth.uid()` e negam usuários anônimos, mas **não exigem `academy_adult_verified` no banco**. A checagem adicionada no cliente V16.2 isoladamente não constitui barreira de segurança suficiente.
- Proposta de política **restritiva adicional** em `supabase/staging/v16_3_adult_rls_policy_preview.sql` para 16 tabelas privadas, mantendo as policies de propriedade já instaladas. A avaliação usa somente `auth.jwt().app_metadata`, nunca `user_metadata`.
- Teste `tests/v16_3_adult_rls_live.sql` executado em banco real dentro de `BEGIN/ROLLBACK` junto à proposta: 16 guards criadas, sessão aprovada acessa próprio snapshot, outra conta não lê e não insere com `user_metadata` falsificado, JWT sem claim administrativa não lê registro. **PASS**, sem mudança persistente no banco.
- **Atenção:** claims existentes em JWT podem permanecer válidas até renovação/expiração. Para revogação estrita em tempo real, será necessário validação de sessão/estado de aprovação no servidor e revisão da arquitetura. Este teste não prova contas reais ou autorização legal.
- A integração pública e a aplicação da política ficam BLOQUEADAS por backup restaurável, revisão da política de privacidade/idade, duas contas adultas reais, testes Auth e migração versionada homologada.
- Teste de navegador com Supabase simulado `tests/v16_3_cloud_conflict_browser.py` cobriu escolha explícita, backup local e negação de aprovação revogada, com CI de pré-produção aprovado. Não é E2E real de Supabase.
