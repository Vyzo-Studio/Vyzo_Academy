# VYZO ACADEMY V16 — Avaliação de prontidão para produção

**Avaliação:** 07/11/2026. **Resultado:** **NÃO APROVADA PARA LANÇAMENTO UNIVERSAL**. O site público pode continuar oferecendo as funcionalidades locais já aprovadas, com os avisos e limites atuais.

## Atualização de engenharia — V16.2 (07/11/2026)

Cinco lotes adicionais possuem evidências documentadas em [V16_2_EXECUTION_CHECKPOINT.md](./V16_2_EXECUTION_CHECKPOINT.md). PRs #31, #33 e #34 integrados à `main`; PRs #29 (Auth) e #30 (pesquisa IA) ainda em pré-produção, separados por bloqueio deliberado de release.

- Auth: reconciliada em branch, mas sem homologação E2E de contas reais; o banco permanece sem usuários e com cadastro fechado.
- IA: endurecimento por função de reserva exclusivamente de servidor validado em transação SQL com rollback, **não implantado**; provedor real não testado.
- Recuperação: ensaio de histórico sintético aprovado no banco real, **não** backup completo nem teste de desastre.
- Editais: extrator offline funcional de texto de PDFs, **não** processador confiável de editais oficiais em produção.
- Questões: correção PT-BR da apresentação de Inglês/Espanhol avançados com gabaritos e IDs preservados; não é curadoria do banco inteiro.

**A avaliação geral permanece NÃO APROVADA PARA LANÇAMENTO UNIVERSAL.**

## Atualização operacional V16.3 — 09/11/2026

Evidências e limites: [checkpoint V16.3](./V16_3_EXECUTION_CHECKPOINT.md).

- **Simulados locais:** treino autoral de 90 questões por dia integrado à `main` no PR #36, com 45+45 áreas, 330/300 minutos, resultados e preservação de brancos. Não equivale ao primeiro dia oficial completo: sem redação conjunta e sem cinco itens oficiais de língua estrangeira. Sem TRI. A curadoria humana integral segue pendente.
- **Editais:** PR #37 integrou pistas editoriais literais por página e linha no PDF local, sem verificar automaticamente origem, edição, retificações ou requisitos. Nunca promover a conteúdo oficial antes de revisão.
- **Privacidade:** PR #29 em draft acrescentou prevenção de conflito de cache e uma **proposta não aplicada** de RLS restritiva para 16 tabelas, testada no banco real com rollback; as policies ativas de titularidade ainda não incluem este guard de aprovação adulta. Real Auth HTTP permanece não homologado.
- **IA e redação:** PR #30 permanece draft, gate de cadastro fechado, sem autorização de provedor; corretor B1 e cadeia #12/#13/#16/#18 não operacionais.
- **Recuperação:** só há ensaio de recuperação lógica e rollback no banco; backup integral, Storage/Auth offsite e restore isolado não comprovados.

**Decisão:** operação estática local pode continuar conforme gates existentes; lançamento universal autenticado, proteção de menores e IA continuam **NÃO APROVADOS**.

## Matriz de liberação

| Requisito | Evidência verificada | Status |
|---|---|---|
| Site estático / CI | GitHub Pages e Quality checks em `main` aprovados; navegação interativa de produção não comprovada nesta auditoria | PARCIAL |
| Simulador ENEM local | 224 questões autorais e 72 legadas; correções e cronômetros locais; 72/224 com verificação quantitativa específica, ainda sem curadoria humana integral | PARCIAL |
| Currículos de escolas | Etapas/séries catalogadas na `main`; microaulas V15.1 ainda em revisão no PR #5, bloqueadas | NÃO LIBERADO |
| Autenticação | PR #8 aberto/draft; `academy/config.js` da main vazio; nenhuma conta Auth e gate de cadastro fechado na última auditoria | BLOQUEADO |
| Supabase | Projeto dedicado e saudável; 20 tabelas com RLS e oito migrações; sem backup de dados/restauração atual comprovados | PARCIAL |
| Privacidade / idade | RLS simulada em SQL real, mas não foram homologados dois usuários reais, controles de menores ou revisão jurídica | BLOQUEADO |
| Pesquisa de exames com IA | PR #10 draft e Edge Function com JWT; sem teste E2E autorizado com provedor/edições reais | BLOQUEADO |
| Redação por IA | PRs #12/#13/#16/#18 encadeados, testes com mocks; sem serviço implantado ou nota real validada | BLOQUEADO |
| Editais / provas | Dois pares oficiais de links 2024; PR #33 adicionou extrator offline de texto PDF local com hash e limites, ainda sem verificação editorial da origem, OCR ou integração com estudante | PARCIAL |
| Backup / recuperação | Histórico do GitHub e versões SQL disponíveis; não constituem dump/restore operacional de usuários/dados | BLOQUEADO |
| Acessibilidade | Testes automatizados de algumas larguras, teclado/foco; não comprovam WCAG 2.2 AA ou leitores de tela reais | PARCIAL |
| Operação e incidentes | Falta observabilidade real do provedor, política de retenção, restore provado e teste de procedimentos de incidente | PARCIAL |

## Proteções que permanecem vigentes

- Não preencher `academy/config.js` da main sem Auth, RLS e consentimento homologados.
- Não alterar `academy_internal.registration_gate.enabled` para liberar inscrições.
- Não configurar ou expor `OPENAI_API_KEY`, `service_role` ou segredos no frontend, no repo ou em logs.
- Não ativar funcionalidades direcionadas a menores antes da revisão LGPD/ECA aplicável e dos controles previstos.
- Não integrar automaticamente PRs dependentes em cadeia; #13 depende de #12, #16 depende de #13, #18 depende de #16; #5 depende de #3.
- Manter compatibilidade de `enem-intelligence-v2`, `enem-intelligence-v1` e `vyzo-academy-v9-guest-1`; testes de importação/restauração antes de migrar dados.

## Critérios mínimos ainda não satisfeitos para produção com contas/IA

1. Auditoria de segurança de `academy_reserve_research` (`SECURITY DEFINER` acessível por `authenticated`), autenticação HTTP com dois adultos devidamente autorizados e confirmação real de e-mail.
2. Validar configuração de Auth, redirects, SMTP e recuperação, incluindo testes de sessões independentes e isolamento entre contas.
3. Política jurídica e medidas efetivas para menores, minimização, exportação/exclusão, retenção e backups restauráveis.
4. Orçamento e autorização explícita para provedores de IA; instalar segredos em servidor e quotas por conta; validar E2E real sem declarar notas oficiais.
5. Revisão editorial verificável do conteúdo escolar, questões, gabaritos e documentos oficiais; não confundir referências com domínio curricular completo.
6. Homologar deploy, acessibilidade, performance, rollback e incident response no ambiente publicado.

## Verificação e fontes

- [Roadmap completo](./VYZO_ACADEMY_MASTER_ROADMAP.md)
- [Relatório de execução V16](./V16_EXECUTION_REPORT_20261107.md)
- [CI da main após lote quantitativo](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42410126661)
- [GitHub Pages após lote quantitativo](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42410126335)
- [PR de Auth #8](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/8)
- [PR de pesquisa com IA #10](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/10)
- [PR de redação #12](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/12)
- [PR de backend B1 #13](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/13)
- [PRs B2 #16](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/16) e [B3 #18](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/18)

**Conclusão:** produção estática com recursos locais segue distinta de plataforma universal autenticada e assistida por IA. A última ainda não está pronta. Atualizar este relatório somente com evidências de QA e operação real.
