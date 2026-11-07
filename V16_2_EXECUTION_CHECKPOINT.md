# VYZO ACADEMY V16.2 — Checkpoint consolidado de engenharia

**Data:** 07/11/2026. **Natureza:** execução real com cinco lotes técnicos; três integrados à `main`, dois isolados em pré-produção. **Lançamento universal não homologado.**

## Lotes entregues nesta execução

| Lote | GitHub | Resultado efetivo | Limitação |
|---|---|---|---|
| A1 — Auth e sincronização reconciliadas | [PR #29](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/29), draft | V8/Stage03 e V9 cloud portados sobre código atual, sem descartar acervo; gate administrativo para conta adulta, importação consensual; CI de pré-produção [PASS](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42417785861) | Sem contas reais, Auth E2E ou implantação; gate público rejeita esta branch intencionalmente |
| A2 — Pesquisa IA privilegiada | [PR #30](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/30), draft | Quota atômica 6/dia e 2/min com RPC service_role e `academy_adult_verified`; teste PostgreSQL real com rollback PASS e [CI de pré-produção PASS](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42416678764) | Nenhuma IA paga executada; migração/novo gateway não implantados. Gate público falha intencionalmente |
| A3 — Restauração sintética | [PR #31](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/31), merge `fa73a037` | Histórico V9 A/B com RLS, exclusão e restauração lógica, hash idêntico, rollback real; [Quality PASS](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42416921522) | Não é dump/restore completo de PostgreSQL, Auth, Storage nem backup externo |
| D1 — Extrator PDF local de editais | [PR #33](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/33), merge `7beb214e` | Script offline em `scripts/ingest_exam_pdf.py`, PDF sintético para QA, limites e hash, extração por página, status de fonte declarada/não verificada; [PDF CI PASS](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42417305524) | Não há OCR, ingestão web ou validação de edital; não é ainda leitor integrado ao aluno |
| F1 — Línguas estrangeiras ENEM | [PR #34](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/34), merge `8f4d1ca` | V6A015/V6A016 com texto-base original inglês/espanhol, perguntas e alternativas PT-BR, gabaritos IDs preservados; [Quality PASS](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42417616186) | Questões autorais, sem atribuição de oficialidade ou revisão integral do banco |

## Estado real de infraestrutura e lançamento

- A `main` após lote F1: `8f4d1ca662365d9e7cffca93d73d56cfbfd6ec7c`. O [GitHub Pages](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42417806778) concluiu SUCCESS. Verificar a [Quality check pós-merge](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42417807007) antes de afirmar aprovação de todo o último commit; a verificação documental não implica navegação real.
- Supabase **exclusivo Academy** (`cfrlqinzsysoqcduqftd`): 0 contas, 0 redações, gate cadastro fechado e tabela B1 ausente na última consulta. Somente pesquisa legada com JWT implantada; IA real não homologada.
- O aviso `SECURITY DEFINER` de `academy_reserve_research` permanece na versão **remota**, pois a migração de hardening A2 é propositalmente draft e deve ser aplicada **junto** ao gateway novo em manutenção/homologação.
- A homologação Auth requer adultos realmente autorizados com confirmação e e-mail reais, RLS HTTP de duas sessões, políticas de menores, backup de dados restaurável e avaliação legal. `tests/v16_2_auth_e2e_existing_users.mjs` foi preparado no PR #29, mas sem credenciais/consentimento executa **SKIP**, não PASS de integração.
- PRs #8, #10, #12, #13, #16 e #18 são parte de dependências abertas. A cadeia de redação continua em teste com mocks, não operacional; nenhuma nota por IA real foi emitida.
- Sem autorização para compras, alteração de custos, cadastro de menores, configuração de segredos, deploy da Auth/IA, ou merge de PRs draft.

## Próximas ações, por dependência

1. Auditar e homologar controle etário/privacidade, SMTP/redirects e duas contas adultas autorizadas no ambiente de homologação; executar o teste real do PR #29.
2. Providenciar backup/restore PostgreSQL/Auth/Storage verificável em ambiente isolado, definir RPO/RTO e observabilidade antes de abrir cadastro.
3. Reconciliar e testar PRs #8/#29 e PRs #10/#30, validar despesas e fonte real; implantar gateway+RPC em conjunto **somente após gates**.
4. Reconciliar a cadeia redação #12 → #13 → #16 → #18 e testar correção real autorizada, com proteção de crianças.
5. Integrar extrações editoriais de editais e cobrir o banco de questões com curadoria humana, sem anunciar universalidade sem provas.

**Critério de continuidade:** verificar GitHub `main`, checks, Supabase e [roadmap](./VYZO_ACADEMY_MASTER_ROADMAP.md). Lotes não homologados permanecem `draft`.
