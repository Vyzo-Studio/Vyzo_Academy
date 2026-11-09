# VYZO ACADEMY V16.3 — Checkpoint de engenharia (09/11/2026)

**Situação:** dois lotes de produto integrados à `main`; um lote de Auth/RLS protegido em PR draft. **Plataforma autenticada com IA NÃO homologada.**

## Evidências de execução

| Lote | Entrega | Evidência | Limitação |
|---|---|---|---|
| A — Proteção Auth/cloud e RLS | [PR #29](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/29) atualizado em pré-produção: V9 exige escolha explícita entre versões, download local antes de continuar, backup pré-troca e verificação de autorização em sessão. SQL de 16 RLS restritivas acrescentadas apenas como preview. | Testes unitários, Chromium com Supabase simulado; teste PostgreSQL **real** executado em BEGIN/ROLLBACK com autorização administrativa, isolamento A/B e user_metadata falsa negada. | PR draft; nenhuma migração de RLS aplicada permanentemente; falta Auth HTTP com duas contas reais, SMTP, backup integral e proteção etária homologada. Claims JWT podem permanecer até expiração. |
| E — Treino ENEM autoral | [PR #36](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/36), squash `5024568e4279d8388abcc666c1b8bf7a72eaa3f6`. 90 questões por dia: 45+45; 330/300 minutos; cronômetro contínuo, autosave, resultados e não respondidas preservadas. | [Quality checks](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42645990209), [PDF](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42645990275) e [Recovery](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42645990451) **PASS** no PR. | Treino com banco autoral, não prova ENEM completa: faltam redação conjunta e cinco questões oficiais por idioma, sem TRI, revisão editorial integral pendente. |
| C — Pistas literais extraídas de PDF | [PR #37](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/37), squash `0f988d150c411573fe9477ed275ae528f1a889b5`. Reutiliza `scripts/ingest_exam_pdf.py`; anota linha, página e trechos textuais com categorias para conferência editorial. | [Quality](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42648295881), [PDF](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42648295879) e [Recovery](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42648295901) **PASS** no PR após correções de regex/fixtures. | Pistas sempre `pendente`, sem autenticar origem, sem OCR, sem vinculação a metas e sem extrair requisitos oficiais homologados. |

## Estado das dependências

- Supabase dedicado `cfrlqinzsysoqcduqftd`: oito migrações anteriores, registro público fechado, tabela do backend de redação B1 não implantada e 20 tabelas com RLS na última auditoria. Teste RLS V16.3 reverteu inteiramente suas alterações.
- O Security Advisor remoto ainda identifica `public.academy_reserve_research(integer)` como `SECURITY DEFINER` executável por `authenticated`. A correção do [PR #30](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/30) permanece draft, precisa de migração + troca do gateway coordenadas e backup homologado.
- Os PRs #8/#10 antigos foram auditados; o código reconciliado canônico proposto está nos PRs #29/#30, **sem merge na main**.
- A cadeia de redação #12 → #13 → #16 → #18 permanece draft; **nenhuma correção real de IA** foi validada ou liberada.
- Testes com Supabase SQL real transacional **não** constituem E2E de usuários reais, restore de desastre, verificação externa de site ou provedor de IA real.
- Não foram criadas contas infantis, comprados serviços ou divulgados segredos privados.

## Continuação prioritária

1. Homologar backup integral com restore isolado, idade/consentimento, SMTP/redirect, duas contas adultas reais e isolamento HTTP; executar roteiro E2E existente do PR #29.
2. Homologar e aplicar **em conjunto** a correção de RPC e o gateway #30, somente com custo e credenciais autorizadas; manter desabilitado caso contrário.
3. Completar cadeia de redação existente, testar provedor real e rubrica ENEM; completar distribuição oficial do treino de 90 itens somente com conteúdo revisado.

**Regra:** não anunciar lançamento universal enquanto Auth, privacidade, recuperação, IA e conteúdo não estiverem comprovadamente prontos.
