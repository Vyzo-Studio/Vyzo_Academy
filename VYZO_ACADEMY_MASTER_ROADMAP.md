# VYZO ACADEMY V16 — Master Roadmap e Matriz de Conclusão

> **Checkpoint de auditoria (Fase 0 / Módulo 01) — 07/11/2026.**
> Auditoria documental/técnica das fontes reais disponíveis, **não** aprovação para produção e **não** autorização para implementar as fases seguintes.
> Fonte da verdade: branch `main`, PRs, Actions, Supabase exclusivo e testes. Reavaliar após qualquer alteração.

## Resumo verificado

- Repositório: [Vyzo-Studio/Vyzo_Academy](https://github.com/Vyzo-Studio/Vyzo_Academy). **`main` em `aa89eb5e3b8b028d197e35da8d7b99bfd6a577aa`**.
- `main`: [Quality checks PASS](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42390932861) e [GitHub Pages deploy PASS](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42390932630), ambos no commit acima. Navegação interativa do site público **não foi verificada** nesta auditoria (ferramenta HTTP não acessou a URL).
- PRs abertos/draft: [#3](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/3) V15, [#5](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/5) conteúdos piloto (base #3), [#8](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/8) Auth, [#10](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/10) pesquisa IA, [#12](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/12) redação A, [#13](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/13) redação B1 (base #12). **Nenhum desses seis integrado à `main`.** PRs #1/#2/#4/#6/#7/#9/#11 fechados por merge; #4 foi fundido na branch V15, não diretamente na `main`.
- CI de HEAD em branches #8/#10/#12/#13: PASS, respectivamente [#8](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42344627843), [#10](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42388982433), [#12](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42397505735), [#13](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42400607043). **Mocks e CI verde não equivalem a Auth ou IA reais validados.**
- Backend: **somente** conexão Supabase `Vyzo_academy` / projeto `cfrlqinzsysoqcduqftd` consultada, status `ACTIVE_HEALTHY`, 20 tabelas Academy, 20 RLS habilitadas, **62 policies**, 8 migrações. Auth **0 usuários**, perfis 0, objetivos 0, redações 0, pesquisas 0; cadastro `academy_internal.registration_gate.enabled=false`.
- A migração `writing_lab_essay_metadata` está no banco, apesar de seu SQL estar apenas no PR #12; **drift de deploy de schema vs código público**. A migração B1 está apenas no PR #13, sem aplicação permanente.
- Função **`academy-exam-research` ativa, v1, `verify_jwt=true`**; código implantado corresponde ao gateway fail-closed em #10. **`academy-essay-assess` não implantada**. `academy/config.js` da main permanece com `url:''` e `publishableKey:''`; a aplicação pública não usa esse Auth.
- Supabase Security Advisor: 3 reservas **intencionalmente fechadas** sem policy (`academy_curriculum_catalog`, `academy_ai_audit_queue`, `academy_guardian_permissions`) e 1 aviso **WARN**, executabilidade de `public.academy_reserve_research` como `SECURITY DEFINER` por `authenticated`. [Ver a remediação oficial](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). A função tem checagem de UID e `app_metadata`, mas requer auditoria/teste HTTP antes de liberação.
- `main` aparece como `protected:false` na API de branches; revisar regras de branch e permissões. Performance Advisor mostra índices não usados em banco vazio; **não os apagar por isso**.
- Existem branches de backup e arquivos [SUPABASE_BACKUP_AND_RESTORE.md](./SUPABASE_BACKUP_AND_RESTORE.md) e [SUPABASE_NEW_ACCOUNT_RESTORATION_20261107.md](./SUPABASE_NEW_ACCOUNT_RESTORATION_20261107.md), mas **nenhum dump/restore de dados atuais comprovado**. Commits/SQL não são backup completo de Auth, Storage ou PostgreSQL.

## Legenda e critério

Estados permitidos: **CONCLUÍDO E VALIDADO**, **IMPLEMENTADO, AGUARDANDO HOMOLOGAÇÃO**, **PARCIALMENTE IMPLEMENTADO**, **NÃO IMPLEMENTADO**, **BLOQUEADO POR INFRAESTRUTURA**, **BLOQUEADO POR SEGURANÇA OU PRIVACIDADE** e **BLOQUEADO POR CONTEÚDO EDUCACIONAL**.

"Concluído" exige comprovação de código + integração + dados + segurança + testes relevantes + serviço externo real quando aplicável. **A ausência de prova não autoriza declarar concluído.** O estado resume o módulo inteiro, não nega subfuncionalidades já existentes.

## Matriz dos 36 módulos

### FASE 0 — Auditoria e consolidação

| Módulo | Classificação | Evidência observada | Pendência principal |
|---|---|---|---|
| 01 — Auditoria integral | CONCLUÍDO E VALIDADO | Inventário de `main`, PRs, árvore de código, CI, banco exclusivo, RLS e Edge Function; matriz nesta entrega. | Revalidar snapshots quando branches/serviços mudarem. |
| 02 — Integração segura de versões | PARCIALMENTE IMPLEMENTADO | Merges anteriores #1/#2/#6/#7/#9/#11; PRs #3/#5/#8/#10/#12/#13 ainda abertos e não integrados. | Rebase e resolução de sobreposições, QA individual, sem merger automático. |

### FASE 1 — Infraestrutura e contas

| Módulo | Classificação | Evidência observada | Pendência principal |
|---|---|---|---|
| 03 — Supabase dedicado | IMPLEMENTADO, AGUARDANDO HOMOLOGAÇÃO | Projeto `cfrlqinzsysoqcduqftd` ACTIVE_HEALTHY; 20/20 tabelas RLS, 62 políticas e 8 migrações. | Backups de dados/restauração, QA HTTP/identidades reais e revisão do SECURITY DEFINER. |
| 04 — Autenticação real | BLOQUEADO POR SEGURANÇA OU PRIVACIDADE | Portais V8/V12 e fluxo cloud no PR #8; produção com `academy/config.js` vazio, gate fechado e 0 contas. | Homologar emails, Auth, proteção etária, dois navegadores/usuários e configurações. |
| 05 — Sincronização em nuvem | IMPLEMENTADO, AGUARDANDO HOMOLOGAÇÃO | Esquema e V8/cloud V9 implementados no PR #8; V9 guest e simulador clássico não sincronizam automaticamente. | Auth real, reconciliação, exportação/restauração e QA simultâneo entre dispositivos. |
| 06 — Proteção de menores | BLOQUEADO POR SEGURANÇA OU PRIVACIDADE | Tabela preparatória `academy_guardian_permissions` fechada, sem processo homologado de idade/consentimento. | Revisão LGPD/ECA/ECA Digital e controles aplicáveis antes de contas infantis. |

### FASE 2 — Educação universal

| Módulo | Classificação | Evidência observada | Pendência principal |
|---|---|---|---|
| 07 — Estrutura curricular | PARCIALMENTE IMPLEMENTADO | `curriculum-taxonomy.mjs` e etapas/disciplinas V15 na `main`; falta cobertura comprovada de habilidades BNCC por ano. | Verificação documental/editorial por série; integrar apenas parte segura dos PRs. |
| 08 — Conteúdos e aulas | BLOQUEADO POR CONTEÚDO EDUCACIONAL | Microcatálogo V15.1 de 3 aulas/18 questões no PR #5, marcado `em_revisao`, não publicado na `main`. | Curadoria humana e ampliação progressiva; proteger experiência para menores. |
| 09 — Banco profissional de questões | PARCIALMENTE IMPLEMENTADO | Banco autoral ENEM com 224 itens (64 originais, 144 complementares, 16 avançados); PR #17 corrigiu explicação de V4009 sem mudar ID ou gabarito; PR #22 acrescenta verificações matemáticas para mais 48 questões (total 72/224) em 12 grupos de tópicos, usando dados dos enunciados. O teste verifica coerência aritmética, NÃO qualidade editorial integral. Existem 22 grupos de enunciados padronizados a revisar editorialmente. | Curadoria humana integral, diferenciação de questões semelhantes, verificação de conteúdo/fonte e testes matemáticos dos demais tópicos. |
| 10 — Diagnósticos personalizados | PARCIALMENTE IMPLEMENTADO | V9/V13/V14 possuem ENEM, exames focados, 30 questões em teste; escola bloqueada sem itens validados. | Diagnósticos reais por série/edital dependem de conteúdo e matrizes compatíveis. |

### FASE 3 — VYZO Exam Intelligence

| Módulo | Classificação | Evidência observada | Pendência principal |
|---|---|---|---|
| 11 — Busca inteligente de exames | PARCIALMENTE IMPLEMENTADO | V10 tem busca e fallback manual; sugestão local confiável do ENEM; seleção assistida testada em mock. | Auth/API real, índices/catálogos de edições verificados e cache. |
| 12 — Pesquisa oficial com IA | BLOQUEADO POR INFRAESTRUTURA | Gateway V10 `academy-exam-research` implantado com JWT; PR #10 aberto; nenhum uso real validado. | Homologar Auth, budgets/secrets, teste E2E com provedor e revisão das fontes. |
| 13 — Leitor inteligente de editais | PARCIALMENTE IMPLEMENTADO | PR #33 integrou parser Python offline de PDFs locais, com extração textual por página, limites, SHA-256 e origem explicitamente não homologada. Não há leitor integrado à experiência do aluno, OCR ou validação automática de editais. | Curadoria oficial, OCR seguro, integração autenticada, versão de retificações e amostras comprovadas. |
| 14 — Acervo de provas anteriores | PARCIALMENTE IMPLEMENTADO | Lote V16 PR #15 reutiliza catálogo `academy/v15-official-papers.mjs`: dois pares prova/gabarito de 2024 encontrados no índice oficial do Inep, adicionados à página V9 com fallback para anos sem URLs; PDFs não puderam ser abertos/verificados (502/timeout). | Curadoria de outras edições e formatos, revisão dos arquivos e possível conversão de itens somente com licenças e QA adequados. |
| 15 — Análise das bancas | NÃO IMPLEMENTADO | Não há análise empírica verificável de padrão/incidência por banca no código publicado. | Construir corpus por edição após acervo oficial. |
| 16 — Preparação automática a partir do edital | PARCIALMENTE IMPLEMENTADO | V9/V14 geram objetivo/diagnóstico/plano local a partir de informações inseridas pelo estudante. | Vincular edital e disciplinas verificados, sem declarar metas específicas sem fontes. |
| 17 — Atualização de informações oficiais | NÃO IMPLEMENTADO | Sem job agendado de retificações/monitoramento e alertas reais. | Ingestão e execução recorrente verificável, confirmação antes de alterações. |

### FASE 4 — Simulados, redação e IA educacional

| Módulo | Classificação | Evidência observada | Pendência principal |
|---|---|---|---|
| 18 — Simulados completos | PARCIALMENTE IMPLEMENTADO | Simulados e correção local ativos; composer por áreas/diagnósticos, banco limitado; prova ENEM 90+redação não validada E2E. | Curar cobertura suficiente e homologar dois dias, tempos e redação. |
| 19 — Cronômetro e ambiente de prova | PARCIALMENTE IMPLEMENTADO | V14 registra cronômetro/pausa/contagem regressiva local e retomada; faltam garantias robustas de prova de alto risco. | Testes de relógio ao fechar/reabrir e integridade entre sessões/dispositivos. |
| 20 — Laboratório de redação | IMPLEMENTADO, AGUARDANDO HOMOLOGAÇÃO | Oficina clássica disponível na `main`; novo editor/temas/versões PR #12 com CI aprovado, ainda draft. | Homologar Auth, dados, migração e integrar com segurança, sem substituir legado. |
| 21 — Corretor de redação com IA real | BLOQUEADO POR INFRAESTRUTURA | PR #13 B1: backend testado com mocks e SQL rollback; PR #16 B2: botão/envio autenticado de revisão salva, mock E2E aprovado; PR #18 B3: tela básica e leitura RLS implementadas em branch de testes. Todos draft, não publicados. | PR #8 Auth homologado, migração/endpoint B1 auditados, orçamento/provedor autorizado e avaliação REAL E2E antes de operacionalizar. |
| 22 — Reescrita e evolução da redação | PARCIALMENTE IMPLEMENTADO | Versões de redação legada e no PR #12; marcações, comparação e histórico de notas não implementados. | Depende de avaliação real por versão e UX posterior. |
| 23 — Professor VYZO com IA | NÃO IMPLEMENTADO | `src/mentor.js` contém professor guiado local, **não** chat com IA real. | Projetar endpoint seguro, conteúdo pedagógico e quotas após Auth. |
| 24 — Estudar por foto ou PDF | NÃO IMPLEMENTADO | Não existe fluxo de upload/extração/validação pedagógica completo. | Políticas de arquivos, privacidade e processamento verificável. |

### FASE 5 — Planejamento e experiência

| Módulo | Classificação | Evidência observada | Pendência principal |
|---|---|---|---|
| 25 — Planejamento personalizado | PARCIALMENTE IMPLEMENTADO | V9/V14 geram agenda local usando diagnósticos e disponibilidade; não existe sincronização universal homologada. | Cobertura por edital/série, conflito multiobjetivo e testes entre dispositivos. |
| 26 — Dashboard do estudante | PARCIALMENTE IMPLEMENTADO | Painel/indicadores locais e portal V8 condicionado ao backend; não há consolidação cloud real ou evidência de domínio amplo. | Convergência de dados após Auth e indicadores verificáveis. |
| 27 — Biblioteca e revisões | PARCIALMENTE IMPLEMENTADO | Biblioteca local, revisão de erros/flashcards e agendamento disponíveis em escopo limitado. | Banco editorial maior, filtros curriculares validados e cloud. |

### FASE 6 — Administração, UX e operação

| Módulo | Classificação | Evidência observada | Pendência principal |
|---|---|---|---|
| 28 — Painel administrativo | NÃO IMPLEMENTADO | Nenhum admin de gestão editorial, usuários e consumo de IA homologado. | Modelo de permissões, trilha de auditoria e controles administrativos. |
| 29 — Responsáveis e professores | BLOQUEADO POR SEGURANÇA OU PRIVACIDADE | Tabela preparatória de responsáveis bloqueada; interface/permissões parentais não homologadas. | Regulação e vínculo autorizado sem acesso cruzado. |
| 30 — Reformulação UX/UI | PARCIALMENTE IMPLEMENTADO | Bloco 03/A PR #11 integrado; suporte mobile/teclado e ajustes de foco testados; três jornadas ainda coexistem. | Navegação unificada com regressão WCAG 2.2 AA e testes assistivos reais. |
| 31 — Desempenho e PWA | PARCIALMENTE IMPLEMENTADO | Lote V16 PR #20 corrige serviço offline: apenas navegações do índice clássico podem atualizar/substituir seu cache, deixando política de privacidade, outras páginas, auth, API e rotas Academy fora do fallback; versão de cache renovada. Teste simulado de eventos Service Worker. | Validar instalação/atualização em navegador real, comportamento de cache em produção e recuperação offline completa; sem afirmar IA offline. |

### FASE 7 — Auditoria e lançamento

| Módulo | Classificação | Evidência observada | Pendência principal |
|---|---|---|---|
| 32 — Segurança máxima | PARCIALMENTE IMPLEMENTADO | RLS e FKs compostas; CI; Advisor traz alerta SECURITY DEFINER; Auth/menores/backup continuam pendentes. | Resolver exceções, revisar configs/rotas e realizar testes ofensivos autorizados. |
| 33 — QA completo | PARCIALMENTE IMPLEMENTADO | CI `main`, #8/#10/#12/#13 aprovado em último HEAD; SQL RLS com claims simulados, navegadores automatizados. | QA com Auth/provedor reais, acessibilidade física, domínio publicado e dispositivos. |
| 34 — Piloto controlado | NÃO IMPLEMENTADO | Não há participantes reais e jornadas homologadas documentadas; 0 usuários Auth no projeto. | Após segurança/contas, autorizar piloto restrito. |
| 35 — Infraestrutura definitiva | PARCIALMENTE IMPLEMENTADO | GitHub Pages e CI aprovados, Supabase exclusivo saudável; sem domínio personalizado verificado nem backup operacional. | Separar homologação/produção, DNS, observabilidade, restore e orçamento autorizado. |
| 36 — Homologação e lançamento | BLOQUEADO POR SEGURANÇA OU PRIVACIDADE | Dependências de Auth, menores, conteúdos e IA real ainda impedem anúncio universal. | Aprovar gates, QA E2E e protocolo de reversão antes do lançamento. |

## Lotes V16 — execução progressiva

| Lote | Escopo | Referências | Estado |
|---|---|---|---|
| 01 | Consolidar documentação auditada de 36 módulos | PR #14, merge `51ea40d`, CI `42403835667` PASS | CONCLUÍDO E VALIDADO (documentação) |
| 02 | Fonte oficial de provas ENEM 2024 na jornada V9 sem PDF convertido | PR #15, `v15-official-papers.mjs`, `v9.mjs`, testes Node e Chromium, workflow `42407086686` (commit `6186995`) | CI E REGRESSÕES APROVADOS; PDFs externos não acessíveis nesta auditoria; cobertura continua parcial |

Observação: “implementado” significa código na branch; serviço externo não verificado permanece não homologado. Atualizar a tabela após o check final.

## Lote pedagógico V16 — Questões autorais

- **PR #17:** correção matemática no cálculo explicado de V4009; resposta correta (45) e ID preservados. Código fonte e `index.html` compilado coerentes.
- `tests/v16_quantitative_bank.test.mjs`: valida gabaritos e cálculos de oito itens por grupo (porcentagens, proporcionalidade direta e médias aritméticas). CI adicionado. Apenas os 24 itens cobertos possuem esta evidência específica; não equivale à revisão humana do banco de 224 questões.
- **Status do Módulo 09 permanece PARCIALMENTE IMPLEMENTADO**.

## Execução V16 — Checkpoint de lotes subsequentes (07/11/2026)

| Lote | PR/commit | Evidência | Estado real |
|---|---|---|---|
| 03 — QA matemático | [#17](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/17), merge `3e19496` | [CI aprovado](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42408110973), 24 questões com contas verificadas, V4009 corrigida | INTEGRADO à `main`; o banco completo ainda exige curadoria editorial |
| 04 — Corretor B2 | [#16](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/16), base #13 (que depende de #12) | [CI mock aprovado](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42407950141); `ESSAY_B2_CHECKPOINT.md` | IMPLEMENTADO / DRAFT; não foi implantado |
| 05 — Relatório B3 | [#18](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/18), base #16 | `ESSAY_B3_CHECKPOINT.md`, testes Node/Chromium e revisão RLS em andamento | IMPLEMENTADO / AGUARDANDO CI E HOMOLOGAÇÃO, NÃO integrado |
| 06 — Consolidação documental | [PR de checkpoint V16] | estado dos lotes, riscos e próximos passos | SOMENTE DOCUMENTAÇÃO |

**Condição obrigatória de release:** PRs #8/#12/#13/#16/#18 devem permanecer bloqueados até homologação Auth, idade/privacidade e avaliação de IA com provedor real. Nenhuma tela de resultado mock equivale a avaliação individual real.

## Lote V16 — Integridade do cache offline

- PR #20: `sw.js` com nova versão de cache e fallback restrito ao índice clássico. Páginas como privacidade/termos não devem sobrescrever a versão offline do simulador e não devem servir a interface errada quando estiverem offline.
- Proteção explícita de `/academy`, `/api`, `/auth`, `/rest`, `/functions` e páginas fora do escopo; `POST` e outras origens permanecem sem interceptação.
- `tests/v16_pwa_cache.test.mjs` simula eventos sem dados pessoais; não substitui testes de instalação real em mobile.

## Lote adicional — ampliação do QA curricular e matemático

- **PR #22:** 48 questões autorais adicionais auditadas computacionalmente: geometria plana, velocidade média, probabilidade, Lei de Ohm, fluxo de energia, concentração, densidade, calor sensível e escala de pH.
- Cobertura matemática automatizada total: **72 de 224**; banco restante e enunciados repetidos aguardam curadoria humana e QA específico. Questões não são oficiais do Inep e não devem ser anunciadas como tal.
- O teste aritmético não comprova adequação à BNCC, estilo ENEM, clareza didática ou ausência de ambiguidade.

## Lote V16 — Gate de segurança do release público (Módulos 02, 32 e 33)

- Branch `feat-v16-release-security-ci-gate`, criada sobre a `main` em `869f149e7ca9c4dea36e3569f391c1ff89c831e8`. PR e CI registrados no checkpoint do lote.
- `tests/v16_release_security_gate.test.mjs`: novo contrato **estático** de segurança para evitar inclusão acidental dos módulos de autenticação, aulas escolares não homologadas e corretor de redação, além de detectar segredos em arquivos públicos, manter o V9 local/legado e impedir o Service Worker de interceptar rotas privadas.
- `.github/workflows/pages.yml`: adiciona o gate cedo na pipeline, antes de regressões extensas. O teste deve permanecer aplicável à `main` pública ainda sem contas.
- Não integra os PRs #8/#10/#12/#13/#16/#18, não ativa contas, IA ou cadastro infantil, não altera Supabase nem o código-fonte de questões.
- **Limitação:** teste estático de release não valida identidade real, proteção de idade, RLS em HTTP, provedor pago nem conformidade jurídica; preservar os bloqueios dos Módulos 04/06/12/21/36.

## Lote V16 — Integridade de fontes na pesquisa de provas (Módulos 11, 12 e 33)

- `academy/v10-research.mjs`: endurece a verificação cliente de URLs institucionais contra normalização antecipada de caminho (`%2e`, `%2f`, `%5c`, `/../` e `//`), mantendo HTTPS/domínios previstos.
- Valida datas de calendário UTC: datas impossíveis (ex.: `2026-02-31`) tornam-se **não confirmadas**, em vez de anunciadas como oficiais.
- `tests/v10_research.test.mjs` contém testes adversariais. O frontend público segue fallback manual sem habilitar autenticação/IA ou serviço pago.
- **Bloqueio mantido:** pesquisa real com provedor/edital não homologada; referências institucionais ainda exigem verificação do conteúdo.

## Lote V16 — Prontidão operacional e documentação da V16 (Módulos 02 e 36)

- `README.md`: status de produção atualizado; distingue infraestrutura Supabase existente de contas/IA públicas ainda bloqueadas.
- `V16_PRODUCTION_READINESS_ASSESSMENT.md`: evidências, dependências e critérios obrigatórios de segurança, conteúdo, QA e lançamento.
- PR #23 (gate de release) e PR #26 (segurança de fontes e datas) foram integrados à `main` com CI aprovado; esta atualização preserva os checkpoints anteriores.
- **Conclusão geral: NÃO PRONTO para lançamento universal**; segue possível operar as funcionalidades locais existentes dentro de suas limitações. Nenhum recurso pago, conta infantil ou autenticação foi ativado.

## Lote V16 — Validação de entrada de busca (Módulos 11 e 33)

- `academy/v10-research.mjs`: a pesquisa deixa de truncar silenciosamente mais de 150 caracteres. Consultas inválidas (links, controles, quebras de linha, `<...>`) são rejeitadas com aviso em PT-BR, antes de chamar o provedor.
- `tests/v10_research.test.mjs`: casos de fronteira para consulta longa, normalização de espaços e entradas não confiáveis.
- Sem chamada paga, sem alteração dos perfis públicos ou do banco; o backend V10 segue bloqueado até a homologação da autenticação e da IA.

## V16.2 — Lote A3: ensaio real de recuperação lógica e isolamento de contas

- `tests/v16_2_archive_recovery_live.sql` foi executado no PostgreSQL real **do projeto Academy exclusivo** em `BEGIN/ROLLBACK`.
- Testou o arquivo privado V9 de uma conta sintética A, preservação exata de IDs de simulados, metas e rascunho, invisibilidade para conta B, exclusão sintética do snapshot ativo, restauração a partir do arquivo separado e validação bit a bit do JSONB via SHA-256, revisão incremental e bloqueio de restauração duplicada.
- Resultado PostgreSQL real: **PASS**, revertendo todos os usuários, a alteração temporária do gate, arquivos e snapshots. CI em `tests/v16_2_recovery_contract.test.mjs` apenas inspeciona o contrato do ensaio; NÃO é o mesmo que rodar o banco no GitHub.
- **Limitação explícita:** esta é recuperação lógica de histórico armazenado na própria base, **não** `pg_dump`/`pg_restore` completo, cópia offsite, Disaster Recovery ou restauração de Auth/Storage. O módulo 03 e o lançamento universal continuam sem homologação de backup operacional.

## V16.2 — Lote D1: extração local de editais PDF (Módulos 13, 16, 24)

- `scripts/ingest_exam_pdf.py` cria JSON com texto extraído por página, contagem de páginas, SHA-256 do PDF e URL institucional **informada**, sem fazer rede, OCR, pesquisa paga nem interpretar requisitos. Limites: 12 MiB, 100 páginas, 12 mil caracteres por página, 250 mil no total; PDF protegido, malformado ou sem cabeçalho é rejeitado.
- A origem permitida é apenas um padrão HTTPS de domínio institucional, **não comprovação** de autenticidade do edital ou de correspondência com o arquivo. Os resultados permanecem como `extraido_sem_revisao`, `origem_confirmada:false` e `conteudo_oficial_homologado:false`; páginas digitalizadas são sinalizadas sem inventar OCR.
- Uso offline de operador: `python scripts/ingest_exam_pdf.py edital.pdf --origem https://www.gov.br/... --saida extraido.json`. Não sobrescreve JSON existente. O conteúdo pode conter dados pessoais; não subir PDFs ou extrações ao GitHub.
- `tests/v16_2_pdf_ingest_test.py` usa documentos **sintéticos gerados localmente**, verifica extração, hash, PDF sem texto, arquivo inválido, spoofing de domínio/URL, porta inválida e não sobrescrita. Pipeline instala `pypdf==5.9.0` e `reportlab==4.4.9` para teste.
- É **fundação independente de processamento**, não leitor automático validado por edital, não prova histórica convertida e não nova UI escolar; revisão humana e integração com o modelo de fontes ainda são necessárias.

## V16.2 — Lote F1: língua estrangeira no estilo ENEM

- Correção pedagógica dos itens **autorais** `V6A015` (Inglês) e `V6A016` (Espanhol): texto-base estrangeiro **preservado integralmente**, apresentação/contextualização, pergunta e cinco alternativas em **português brasileiro**, como estrutura observada nos cadernos do ENEM. Não reproduz nem atribui caráter oficial às questões autorais.
- IDs `V6A015/V6A016`, posições dos gabaritos (respectivamente índices 3 e 2), explicações e histórico de progresso preservados. As outras duas questões de línguas estrangeiras `Q011/Q012` já estavam em PT-BR.
- `index.html` recompilado com fonte `src/advanced_questions.js` para manter consistência da experiência clássica.
- `tests/v16_2_foreign_language_enem.test.mjs` controla 224 IDs únicos, quatro enunciados em português, trechos estrangeiros originais, alternativas, gabaritos e bundle HTML. Workflow de publicação incorpora o teste. Questões ainda dependem de revisão editorial pedagógica completa.
- Referência de estilo: índice oficial de cadernos do ENEM 2024, https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2024

## V16.2 — Continuidade da execução autônoma, checkpoint dos cinco lotes

- Ver [V16_2_EXECUTION_CHECKPOINT.md](./V16_2_EXECUTION_CHECKPOINT.md) para PRs, commits, evidências e bloqueios.
- **Pré-produção:** #29 (Auth e sincronização V9 reconciliadas, autorização administrativa de adultos; sem contas reais) e #30 (gateway de pesquisa e reserva apenas pelo serviço, testes PostgreSQL reais com rollback). Ambos draft, CI de estágio aprovado; o gate de publicação é intencionalmente restritivo.
- **Integrado à main:** #31 (ensaio real sintético de recuperação A/B, não backup de desastre), #33 (extração de PDF local, não leitura editorial verificada) e #34 (correção das duas questões autorais avançadas de idiomas para enunciado/alternativas PT-BR).
- A `main` após #34 é `8f4d1ca662365d9e7cffca93d73d56cfbfd6ec7c`; histórico original dos estudantes mantido. CI do PR #34 aprovado e GitHub Pages pós-merge aprovado. Testes com provedores de IA e dois usuários Auth reais **não realizados**.
- Os 36 módulos seguem **não concluídos como plataforma universal**. O módulo 13 avança de não implementado para **parcial** apenas devido à fundação offline de extração de PDF; não é portal de editais real ou auto-homologado.

## V16.3 — Lote E1: treino autoral de 90 questões por dia do ENEM (09/11/2026)

- A opção `day1` utiliza **45 Linguagens + 45 Humanas**, prazo fixo contínuo de **330 minutos**; `day2` utiliza **45 Natureza + 45 Matemática**, prazo fixo de **300 minutos**, seguindo a distribuição de áreas e duração regular descritas pelo Inep em 2026: https://www.gov.br/inep/pt-br/acesso-a-informacao/perguntas-frequentes/exame-nacional-do-ensino-medio-enem/no-dia-do-exame-orientacoes/em-que-horario-serao-aplicadas
- Integra o compositor validado existente `composeExam` e os cronômetros V14 à jornada V9; o seletor de tamanho não substitui os 90 itens em modo de dia. O fluxo completo inclui salvamento local, questões marcadas, retomada e correção já existentes.
- **Não equivale à prova oficial completa:** o primeiro dia ainda não integra redação; o banco autoral oferece somente **dois itens por língua estrangeira**, portanto a distribuição específica de idioma não replica as cinco questões oficiais; sem TRI. A interface avisa antes de iniciar e na correção.
- Não concede o status `SIMULADO ENEM 1º DIA OFICIAL COMPLETO`; permanece como **treino autoral das 90 questões**. Não usa novos conteúdos falsamente atribuídos ao Inep.
- Testes de unidade `tests/v16_3_enem_day.test.mjs` verificam 90 itens únicos, áreas 45/45, idioma escolhido, prazo, pontuação com questões em branco neutras e insuficiência de cobertura. `tests/v16_3_enem_day_browser.py` valida seleção/expiração em Chromium com armazenamento simulado. Testes de browser **não comprovam backend de Auth, nem correção de redação real**.
- Dependência da futura experiência integral: redação validada, cinco itens de língua estrangeira por modalidade, curadoria do banco e testes E2E de redação + prova em conjunto.

## V16.3 — Lote C3.1: pistas estruturadas para revisão de editais PDF

- O parser local `scripts/ingest_exam_pdf.py`, já integrado pelo PR #33, agora inclui `pistas_para_revisao` no **mesmo** JSON extraído, sem serviço duplicado, IA, rede ou cobrança.
- Pistas são apenas linhas **literais e conferíveis por página** do PDF, relacionadas a identificação de edital, retificação, data da prova, conteúdo programático, banca ou cargos/cursos. Cada ocorrência recebe página, número de linha do texto extraído, trecho exato e `estado_revisao:pendente`; os fatos não são interpretados/confirmados.
- Limites adicionais: 48 ocorrências por extração e 450 caracteres por trecho. O campo `origem_confirmada` continua `false`, e nenhum texto é publicado, promovido a requisito de prova ou executado como comando.
- O teste `tests/v16_2_pdf_ingest_test.py` cobre linha literal existente, referências de página, recusa de homologação automática, limite de ocorrências, PDF inválido e origem potencialmente falsa.
- **Pendente:** conferência humana do PDF/retificações, OCR seguro, tabelas, aprovação editorial, controle de versão de edital e vinculação de programas realmente validados às metas.

## V16.3 — Integração funcional e checkpoints de novembro de 2026

- **Lote A — Auth segura (draft #29):** conflito entre cache V9 e nuvem exige download/decisão explícita; progresso anterior arquivado antes de importar remoto. Revogação de autorização no cliente interrompe novas gravações, sem alegar proteção se JWT ainda estiver válido. Preview RLS de 16 tabelas testado apenas com rollback no banco dedicado; produção ainda não contém a política restritiva de adulto aprovado.
- **Lote E — ENEM autoral (integrado #36):** primeiro e segundo dias agora possuem treino de 90 questões, áreas 45+45, prazos de 330/300 minutos e expiração/correção, preservando IDs e histórico. Não atende o primeiro dia integral oficial sem redação; tampouco possui cinco itens por idioma ou TRI. Testes em Chromium e checks do PR passaram.
- **Lote C — Editais PDF (integrado #37):** `ingest_exam_pdf.py` produz pistas literais auditáveis por página/linha. Revisão e autenticidade sempre pendentes. Testes corrigidos e aprovados.
- Todos os detalhes, evidências e bloqueios estão em [V16_3_EXECUTION_CHECKPOINT.md](./V16_3_EXECUTION_CHECKPOINT.md). **A matriz de 36 módulos continua parcial; nenhuma conta real ou IA paga foi ativada nesta execução.**

## Diferenças, sobreposições e conflitos

1. **Três jornadas coexistem:** simulador clássico (`src/app.js`, chave `enem-intelligence-v2`), V9 local (`academy/v9.mjs`, `schema:9`) e V8 cloud (`academy/app.mjs`, não configurado na `main`). Todas possuem objetivos/provas ou redações, mas **não são um banco compartilhado**. Evitar unificação sem plano de migração e fallback.
2. **PRs divergentes da main:** #3 está 24 commits à frente / 6 atrás; #5 61 à frente / 6 atrás; #8 24 à frente / 2 atrás; #10 11 à frente / 1 atrás (comparação de branches em 07/11). Sobreposições detectadas em `.github/workflows/pages.yml`, `academy/app.mjs`, `academy/v9.mjs`, testes V8 e estruturas curriculares. Não realizar merge múltiplo ou resolver conflitos removendo funcionalidades.
3. **Dependência em cascata:** #5 usa #3 como base; #13 usa #12 como base. Não integrar #13 diretamente em `main` sem revalidar e reconciliar #12. A main V15 contém somente metadados seguros; pilotos V15.1/V12 executáveis permanecem explicitamente bloqueados por `tests/v15_release_gate.test.mjs`.
4. **Drift operacional/documental:** backend e migrações remotas já existem, mas a main não liga Auth; README e alguns release notes preservam descrições históricas de "sem projeto Supabase". **Atualizar documentação de operação apenas no módulo de integração**, não maquiar a real disponibilidade.
5. **Riscos de integridade:** preservar IDs das questões, chaves locais, histórico de redação, snapshots e `user_id`; definir restauração testada e rollback antes de unificar contas, publicar migrações ou ligar IA. SQL de testes anteriores com `BEGIN/ROLLBACK` é evidência de RLS simulada, não de Auth real.

## Priorização e próxima unidade recomendada

**P0 imediato:** **Fase 0, Módulo 02 — Integração segura de versões, subetapa 02/A (planejamento de reconciliação)**, começando por matriz de diferenças e conflitos entre PR #8 e as mudanças de V15/#12, backup verificável e política de merge; sem abrir inscrições, consumir IA ou publicar módulos incompletos. Antes de qualquer *merge* com Auth: definir pipeline de homologação real e revisar avisos de segurança e política de menores.

**P1:** homologação real do Módulo 04 (Auth + 2 contas adultas verificadas), Módulo 03 (backups e hardening), integração ordenada do #12/#13 e pesquisa real de exames sob orçamento autorizado.

**P2:** ampliar curadoria do conteúdo BNCC/ENEM, banco de questões e simulados, PDFs/edital, professor e UX; não anunciar escolar universal antes de cobertura documentada.

## Procedimento para atualizar esta matriz

- Conferir `main`, PR base/head e checks, migracões instaladas e configurações de deploy a cada nova unidade.
- Para classificar "CONCLUÍDO", anexar testes, operação E2E real (se externo), privacidade e recuperação de dados.
- Atualizar evidence links/commits por módulo; não apagar históricos.
- Registrar alterações pequenas em PR dedicado antes de integrar; manter PRs de Auth/IA em draft até homologação.

### Referências técnicas da auditoria

- `README.md`, `QA_REPORT.md`, `V8_RELEASE_NOTES.md`, `V9_RELEASE_NOTES.md`, `V10_RELEASE_NOTES.md`, `V13_QA_REPORT.md`, `V14_RELEASE_NOTES.md`, `V15_RELEASE_NOTES.md`.
- `STAGE02_SUPABASE_BACKEND_REPORT.md`, `STAGE03_AUTH_SYNC_REPORT.md` no PR #8, `BLOCK02_A_SECURE_AI_CHECKPOINT.md` no PR #10.
- `academy/config.js`, `academy/curriculum-taxonomy.mjs`, `academy/v15-pathways.mjs`, `academy/v9.mjs`, `src/app.js`, `sw.js`, `tests/v15_release_gate.test.mjs`.
- `.github/workflows/pages.yml`, GitHub Actions e Pages de `main`; `tests/essay_lab_browser.py` PR #12; `tests/essay_b1_backend.test.mjs` PR #13; migrações Supabase remotas e Security/Performance Advisors.
- **Limitação explícita:** não houve navegação interativa do domínio publicado nem teste novo de Auth/IA com usuários/provedor reais nesta execução documental. Nenhuma migração ou configuração operacional foi alterada.

**Próxima ação sob autorização futura:** Fase 0 / Módulo 02. Esta auditoria termina no Módulo 01.
