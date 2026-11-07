# VYZO ACADEMY V16 — Relatório de execução, 07/11/2026

**Escopo:** progresso executado na sessão; não representa conclusão dos 36 módulos nem homologação pública.

## Entregas integradas na main

| Lote | PR | Commits de merge | Teste |
|---|---|---|---|
| 01 — auditoria / roadmap | [#14](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/14) | `51ea40d` | [Quality checks PASS](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42403835667) |
| 02 — provas anteriores ENEM 2024 | [#15](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/15) | `a33fcf1` | [Quality checks PASS](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42407332366) |
| 03 — erro matemático V4009 | [#17](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/17) | `3e19496` | [Quality checks PASS](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42408110973) |

A branch main também passou em [CI após #17](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42408645403) e [GitHub Pages após #17](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42408644813). A navegação manual real pelo domínio publicado não foi verificada nesta sessão.

**Resultados reais e limites:** O acervo adiciona dois pares de links prova/gabarito de 2024 referenciados no índice do Inep; leitura dos PDFs falhou (502/timeout) e **nenhuma questão foi extraída ou convertida**. A questão autoral V4009 tinha justificativa aritmética errada (18/4 não é 4), corrigida sem alterar ID ou gabarito. O novo teste computacional verifica 24 de 224 itens; isso **não** é curadoria editorial dos 224.

## Entregas de pré-produção em rascunho

| Lote | PR | Implementado | Bloqueio |
|---|---|---|---|
| Redação A | [#12](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/12) | catálogo, editor, versões e salvamento | Auth real e homologação |
| Redação B1 | [#13](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/13) | contrato ENEM, gateway, migração privada, mock e SQL rollback | provedor, permissão, gasto, migração e implantação |
| Redação B2 | [#16](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/16) | botão/solicitação de revisão salva, cliente auth-gated, retry e deduplicação | depende #13/#12/#8; CI mock aprovado, não deployado |
| Redação B3 | [#18](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/18) | leitura RLS persistida e relatório DOM seguro, sem notas simuladas no produto | depende #16 e Auth real; testes executando na criação deste relatório |
| Pesquisa oficial com IA | [#10](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/10) | Edge Function segura, JWT, quota, citações | Auth, secrets, aprovação de orçamento, teste E2E |
| Auth e sincronização | [#8](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/8) | login, recuperação, cloud, importação com controles em branch | consentimento, idade, emails reais, 2 sessões reais e QA |

**Importante:** A implantação parcial de uma Edge Function de pesquisa não é comprovação de IA real operacional; nenhuma nota de redação por provedor foi obtida nesta execução. Os PRs #3 (V15 universal) e #5 (piloto escolar) também permanecem draft; não publicar séries sem conteúdo revisado e proteção de menores.

## Segurança e infraestrutura

- Supabase Academy exclusivo ativo em `sa-east-1`; 20 tabelas e RLS nas 20; 62 policies; 8 migrações; inscrição bloqueada no `academy_internal.registration_gate`. Na última leitura: **0 contas Auth, 0 redações e 0 pesquisas reais persistidas**.
- Pesquisa `academy-exam-research` implantada com `verify_jwt=true`, porém sem integração real de IA autorizada; B1 `academy-essay-assess` não implantada e tabela de avaliações B1 ausente no projeto remoto.
- Alerta do Supabase Security Advisor: `public.academy_reserve_research` é `SECURITY DEFINER` executável por `authenticated`. A função verifica `auth.uid` e `app_metadata`, mas **requer revisão e teste HTTP real antes do lançamento**. [Referência de hardening](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- As três tabelas preparatórias sem policies estão fechadas intencionalmente; os avisos INFO não equivalem a vazamento.
- Código SQL/branches de backup **não** constituem dump recuperável do banco (incluindo Auth/Storage). Nenhum restore real homologado.
- Nenhuma chave privada adicionada ao navegador. `academy/config.js` da main ainda possui URL/chave pública vazias; novos cadastros não foram habilitados.
- Nenhuma compra, ativação de conta de menor, alteração de recursos pagos, liberação de IA ou publicação de módulos não homologados.

## Avaliação de prontidão de produção

**Status: NÃO PRONTA PARA O PÚBLICO PRETENDIDO.**

A main é uma base pública local com simulados, diagnóstico e partes do acervo, mas a arquitetura de contas cloud e pesquisa/correção de IA exige autorização e QA antes de ser anunciada como operacional. Ensino Fundamental e Médio carecem de revisão curricular e questões específicas, além de políticas etárias aplicáveis. Os testes unitários, mocks e SQL com JWT simulado são necessários, porém não substituem E2E autorizado com duas contas reais, testes de privacidade, provedor real, PDFs, dispositivos físicos e restauração de backup.

**Próximo lote prioritário:** alinhar PR #8 com as versões publicadas; homologar Auth, e-mail e RLS com duas contas adultas controladas, revisar o aviso `SECURITY DEFINER` e testar backup/restore. Só então aprovar integração de B1/B2/B3 com provedor real e orçamento controlado.

## Controle operacional

- Fonte de verdade: [VYZO_ACADEMY_MASTER_ROADMAP.md](./VYZO_ACADEMY_MASTER_ROADMAP.md), atualizada conforme PRs e checkpoints.
- Nenhum trabalho deve ser declarado concluído com base somente em CI simulado.
- Não é permitido fundir PRs de menores, Auth ou IA até homologação aplicável.
- **Este relatório marca apenas o fim da execução documentada, não a conclusão do roadmap.**
