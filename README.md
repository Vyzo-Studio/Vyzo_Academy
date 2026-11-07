# VYZO ACADEMY — Plataforma educacional

**Repositório oficial:** https://github.com/Vyzo-Studio/Vyzo_Academy

**Site:** https://vyzo-studio.github.io/Vyzo_Academy/

## Estado atual do projeto — V16 (07/11/2026)

A versão **publicada** contém o simulador clássico, a jornada local V9, avanços V13/V14/V15 em currículo e diagnósticos, PWA limitada e links oficiais do acervo ENEM 2024. O banco de 224 questões é **autoral**, e a revisão aritmética automatizada cobre apenas parte dele. O funcionamento visual não comprova cobertura curricular universal.

**Infraestrutura existe, mas não está liberada no site:** há Supabase **exclusivo da Academy** com esquema, RLS e migrações; a `academy/config.js` da `main` mantém URL/chave públicas vazias, não existem contas de alunos ativas e o bloqueio de cadastro permanece fechado. Uma Edge Function de pesquisa está implantada com JWT obrigatório, mas a integração com provedor pago e autenticação real **não foi homologada**. O laboratório de redação avançado e o corretor de IA estão somente em PRs de pré-produção; não existe correção individual por IA operacional no site público.

**Segurança e privacidade:** não abrir inscrições, contas de menores ou serviços com custo até homologação de idade/consentimento, e-mails reais, sessões A/B, backups e quotas. A `main` preserva as chaves de dados locais existentes. Não inserir segredos no navegador. GitHub Pages e testes automatizados não substituem auditoria humana de produção.

Consulte a [matriz dos 36 módulos](./VYZO_ACADEMY_MASTER_ROADMAP.md), o [relatório operacional V16](./V16_EXECUTION_REPORT_20261107.md) e as [notas da V14](./V14_RELEASE_NOTES.md). O conteúdo abaixo é histórico e descreve entregas anteriores, não o status integral da V16.

---

# VYZO ACADEMY — Universal Exam Mentor v3 (incremental)

Plataforma educativa independente, executada no navegador, hospedável no GitHub Pages. A evolução v3 **não reconstrói o sistema v2**: mantém o banco atual, o motor de simulados, os dados já salvos, a correção, a redação e o recurso de recuperar respostas antigas.

> **IMPORTANTE:** questões do banco são autorais, não questões oficiais do Inep. Não existe nota TRI oficial, avaliação automática por IA nem pesquisa de editais em tempo real nesta versão. Resultados são indicadores pedagógicos locais.

## O que foi acrescentado na v3

- **Meu objetivo:** cadastro de tipo de prova, prova/órgão, cargo ou curso, edição, banca opcional, data, horas, dias, nível, dificuldades e preferência de estudo, com salvamento automático.
- **Explorador de provas:** diretório de fontes oficiais e um campo para colar o conteúdo programático de um edital. A identificação de matérias é apenas uma busca local por palavras: não valida edital, vagas, regras ou banca.
- **Professor guiado:** revisão de tópicos do banco autoral, explicações e exemplos contextualizados, registro de anotações e prática sobre o mesmo assunto. **Não é um chatbot de IA.**
- **Revisões e flashcards:** 16 cartões didáticos com resposta revelada quando solicitada, autoavaliação e agenda 1/3/7/14/30 dias. Revisão das questões erradas e tentativa de reteste com questões ainda não respondidas do mesmo assunto, apenas quando existirem.
- **Plano de estudo individual:** depende do perfil e de ao menos um diagnóstico ENEM. Gera blocos por data e minutos com base no histórico, horários e dias disponíveis. Um assunto só pode ser considerado dominado após evidência suficiente; não existe certeza automática.
- **Oficina de redação:** temas inéditos para treino, editor, salvamento de versões, sorteio sem repetição imediata e checklist das cinco competências. **Sem nota gerada por IA**, que dependeria de serviço autorizado.
- **Correção:** acesso direto ao conteúdo correspondente em cada questão corrigida, além das explicações anteriores.
- **Integridade:** backup pré-finalização adicional na chave `enem-intelligence-recovery-<id>`, sem apagar o histórico; dados novos armazenados junto do mesmo objeto v2.
- **Mobile:** menu com rolagem independente para acomodar novas seções.

## Funcionalidades anteriores mantidas

- 64 questões novas contextualizadas (16 por área), 72 questões legadas utilizadas exclusivamente em possíveis recuperações.
- Simulados por área, disciplina, assunto e amostras dos dois dias do ENEM, língua estrangeira única; 5 alternativas.
- Simulado em andamento com autosalvamento, cronômetro opcional, progresso, navegação, marcador para revisão e confirmação de finalização no próprio site.
- Correção comentada, respostas em branco identificadas separadamente, indicadores de desempenho, histórico, modo claro e escuro, backup e importação JSON, redação e plano básico.

## Segurança e compatibilidade

A chave principal **permanece `enem-intelligence-v2`**, sem criar um novo armazenamento incompatível. O estado v3 usa o campo opcional `mentor` com versão independente. O código continua lendo a chave `enem-intelligence-v1` para possíveis resgates. A exportação JSON inclui questões, provas, histórico, redação e os dados v3; a importação preserva `mentor` quando presente. O sistema não envia respostas ou documentos para servidores.

A privacidade depende também das configurações do navegador/dispositivo; não há contas nem sincronização em nuvem. É recomendável baixar backup JSON durante uma prova longa. A versão antiga fica preservada na branch `backup-enem-v2-nov2026`.

## Requisitos que ainda dependem de infraestrutura ou curadoria

- Professor IA com linguagem livre, geração e correção automática confiável: requer backend, provedor autorizado, gestão de custos e proteção de credenciais.
- Avaliar redações e gerar nota por competência com IA: ainda não implementado; só há guia de autocorreção.
- Pesquisa viva de concursos e leitura automática de PDF: demanda serviço de pesquisa/documentos; atualmente o estudante consulta fontes oficiais e pode colar trechos do edital.
- Recomendações de vídeos com título, canal, duração, curtidas e visualizações verificados: a aplicação abre **busca do YouTube**, sem inventar métricas. Integração com YouTube Data API exigiria autorização e backend.
- Provas de concurso com CERTO/ERRADO, redação técnica e regras por banca: exigem edital validado e banco próprio. O banco ENEM **não** é exibido como avaliação específica de outro concurso.
- 180 itens oficiais, TRI, pesquisa longitudinal oficial 2021–2025 e análise psicométrica: não implementados nem simulados.

## Desenvolvimento

Arquivos editáveis: `src/template.html`, `src/styles.css`, `src/questions.js`, `src/legacy.js`, `src/app.js` e `src/mentor.js`. `scripts/build.py` gera a distribuição autossuficiente `index.html`.

```bash
python3 scripts/build.py
node tests/qa.mjs
python3 scripts/build.py --check
```

Há testes de navegação com Chromium automatizado durante o desenvolvimento; ver `QA_REPORT.md` para escopo e resultados. O site é publicado pelo GitHub Pages do repositório a partir da branch `main`; o workflow `.github/workflows/pages.yml` contém apenas a verificação de qualidade.

- Repositório: https://github.com/Vyzo-Studio/Enem_simulator
- Site previsto: https://vyzo-studio.github.io/Enem_simulator/
- Provas oficiais do Inep: https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos

**VYZO ACADEMY:** mais do que simulados, um acompanhamento didático verificável — com limitações identificadas.


## V4 — Simulados de 10 a 100 questões inéditas (04/11/2026)

- Banco autoral: **208 questões** (64 existentes + 144 novas), com situações contextualizadas, cálculos e alguns recursos visuais originais. Os 72 itens antigos continuam exclusivamente na recuperação.
- Escolha **10, 20, 30, 40, 50, 60, 70, 80, 90 ou 100**; o número é permitido apenas quando há questões inéditas suficientes para os filtros escolhidos.
- O histórico persistente `seenIds` reserva as questões ao iniciar uma prova; o sorteio exclui as já iniciadas, concluídas e importadas. Backups antigos não reiniciam a relação de perguntas já vistas.
- Quando o saldo for insuficiente, a prova não começa: o banco é finito e a plataforma não inventa questões para completar uma quantidade pedida. Em assuntos muito específicos pode haver menos de 10 itens inéditos.
- A navegação foi aprimorada com barra rápida no celular, localização da página, salto por número de questão e botão para próxima questão pendente.
- Compatibilidade preservada com o armazenamento `enem-intelligence-v2`, resultados antigos, redações e recuperação V1/V2/V3.
- A prevenção de repetição vale enquanto os dados locais ou um backup importado forem mantidos. Limpar o navegador ou trocar de aparelho sem backup pode apagar a relação de questões usadas.

O conteúdo adicional é mantido em `src/extra_questions.js`, integrado pelo `scripts/build.py`. Todas as questões são autorais e não são itens oficiais do Inep.


## Modos de tempo do simulado

Na configuração, escolha **Cronômetro crescente** (começa em zero, mede o tempo decorrido e não finaliza a prova automaticamente) ou **Contagem regressiva** (prazo de 1 a 360 minutos com correção automática ao chegar a zero). Quando o prazo termina, as alternativas já marcadas são preservadas e as não respondidas permanecem em branco. Se a prova for retomada depois do término do prazo, a finalização ocorre imediatamente. Dados antigos com o campo `timed` continuam compatíveis.


## VYZO ACADEMY V5 — reformulação visual e navegação

A V5 reorganiza a interface preservando as funções existentes e a chave de armazenamento `enem-intelligence-v2`. Foi mantido o banco de 208 questões autorais e 72 questões antigas para recuperação.

- Dashboard com objetivo informado, botão para retomar simulado, atividades pendentes, revisões e desempenho real.
- Cinco destinos principais: Início, Estudar, Simulados, Redação, Resultados; opções complementares recolhíveis. Menu lateral rolável e navegação mobile.
- Configuração do simulado em três etapas: conteúdo, 10–100 questões e cronômetro crescente/regressivo, com resumo visível.
- Durante a prova, o mapa de questões abre em uma gaveta no celular; o enunciado aparece primeiro. Controle de tamanho do texto e botões de navegação ficam acessíveis.
- Redação unificada na navegação com duas abas: Rascunho rápido e Temas e versões. Os dois históricos de escrita são preservados sem migração destrutiva.
- Antes de trocar tema com rascunho preenchido, o texto é salvo como versão.
- Importação com escolha explícita entre **Mesclar** e **Substituir**, backup anterior automático, retenção de provas e rascunhos conflitantes.
- Alterações por outra aba geram bloqueio de gravação concorrente e opção de baixar cópia antes de sincronizar.
- Em falha de persistência ao finalizar, inicia download de backup dos resultados.
- CSS responsivo e design system ajustados para 320–1440 px, temas claro/escuro, ícones SVG sem dependência de CDN.

**Limites:** o app continua estático no GitHub Pages, sem login ou sincronização em nuvem, sem IA real de redação e sem questões oficiais declaradas como tais. A recuperação depende de dados disponíveis no navegador ou em backups JSON. Testes de navegador realizados localmente com Chromium e armazenamento emulado; validação de todos os dispositivos físicos e WCAG 2.2 AA não concluída.


## V6 — Proteção de respostas e melhorias

- Corrigida a finalização automática com janela de confirmação aberta.
- Validação de histórico completo na importação de JSON; backups incompletos são recusados sem sobrescrever os dados.
- Retirado corte silencioso dos últimos 150 simulados e do histórico de versões da redação.
- Backup acessível na prova, mapa filtrável, atalhos A–E, setas e R, ampliação persistente de texto, tabelas alternativas para gráficos.
- Adicionadas 16 questões avançadas autorais: 224 novas e 72 legadas exclusivamente para recuperação.
- Sessões de estudo com início, pausa e encerramento, sem contagem automática de minutos fictícios.
- PWA opcional com cache de arquivos públicos e página de privacidade.
- Testes Chromium automatizados no fluxo de qualidade.

**Limitações:** Sem IA conversacional, correção de redação por IA, contas, sincronização em nuvem ou cálculo TRI oficial. O banco necessita revisão editorial contínua.


## Nova identidade VYZO ACADEMY

O nome exibido no site, nas páginas, nos metadados, no manifesto e nos novos backups foi atualizado para **VYZO ACADEMY**. O projeto continua preparando estudantes para ENEM, vestibulares, concursos e outras avaliações.

**Dados preservados:** as chaves internas `enem-intelligence-v2` e `enem-intelligence-v1` não foram renomeadas, para manter as respostas, redações e o histórico existentes.

**Renomeação administrativa:** a URL do repositório continua https://github.com/Vyzo-Studio/Enem_simulator até o proprietário alterar `Enem_simulator` para `Vyzo_Academy` em Settings → General → Repository name. Após isso, confira a URL do GitHub Pages e o cache do aplicativo instalável. Não divulgar a URL nova antes da confirmação.


## VYZO ACADEMY V8 — nova jornada (configuração pendente)

A nova arquitetura encontra-se no [portal V8](./academy/) em módulo independente, preservando o simulador anterior. **O login só será liberado após provisionar um Supabase dedicado** (com confirmação de e-mail e RLS) e testar as políticas entre dois usuários reais. A V8 não finge cadastro nem armazenamento em nuvem enquanto a configuração não está pronta.

- [Instruções de ativação](./academy/DEPLOYMENT.md)
- [Migração SQL segura](./supabase/migrations/202611050001_vyzo_academy_v8.sql)
- [Relatório de testes](./V8_RELEASE_NOTES.md)


## Acesso à V8 após renomeação do repositório

- Simulador completo existente: https://vyzo-studio.github.io/Vyzo_Academy/
- Portal de cadastro e diagnósticos: https://vyzo-studio.github.io/Vyzo_Academy/academy/
- Questionário público demonstrativo: https://vyzo-studio.github.io/Vyzo_Academy/academy/demo.html

O questionário demonstrativo contém 10 questões autorais, correção comentada e **não salva respostas**. Na ausência do Supabase dedicado, o portal apresenta uma **prévia desativada** do cadastro, nunca um formulário de senhas funcional. Após configurar uma instância exclusiva e testar o isolamento entre usuários, o portal habilita os formulários reais.


## V9 — questionário → diagnóstico → plano baseado em desempenho

**Início imediato no modo local:** https://vyzo-studio.github.io/Vyzo_Academy/academy/v9.html

O aluno escolhe a(s) prova(s), informa matérias, minutos e dias disponíveis, nível autodeclarado e dificuldades. Depois faz um diagnóstico inicial de 10/20/30 ou 3–50 questões (dependendo da disponibilidade). A correção separa acertos, erros e itens em branco; avalia matérias e assuntos, destacando a baixa confiança com poucas respostas. O calendário é criado **somente após o diagnóstico individual de cada prova**, inclui cobertura de tópicos ainda não avaliados e respeita um orçamento global de tempo diário.

Os alunos podem salvar e retomar a avaliação, ver explicações, estudar exemplos existentes, concluir tarefas, retestar com novas questões, ver tendências descritivas e exportar/importar backup V9. Quando uma segunda prova é diagnosticada, atividades futuras pendentes são supersedidas com histórico preservado e o tempo é redistribuído.

**Importante:** este fluxo está em **modo local**, sem conta e sem sincronização. Os dados ficam em `localStorage` na chave `vyzo-academy-v9-guest-1`, independente de `enem-intelligence-v2`. O aluno deve evitar computadores compartilhados e manter backups. O portal Supabase V8 permanece separado e indisponível até que o backend dedicado seja configurado, sua migração aplicada e as políticas RLS verificadas entre usuários reais. Não existe IA externa nem ranking oficial, e avaliações provisórias de concursos não são declaradas específicas de uma banca.


### Primeiro acesso ao projeto

O aluno novo, sem armazenamento anterior da V1/V2, é encaminhado da raiz do site para `/academy/v9.html`. O usuário com dados antigos continua no simulador original. Para abrir o simulador original sem dados locais, use `index.html?classic=1`. Essa rota não converte automaticamente o histórico anterior.


## V10 — Busca inteligente de provas

A busca por nome está integrada ao primeiro passo do questionário em [academy/v9.html](./academy/v9.html). O aluno pode digitar o nome, selecionar entre opções com links de fontes oficiais quando o servidor estiver configurado, confirmar os detalhes e continuar para o diagnóstico V9. O plano continua bloqueado até o resultado de cada diagnóstico.

**Estado real:** o projeto Supabase exclusivo e a função com API externa **não estão implantados**. A interface informa a indisponibilidade da pesquisa real e oferece configuração manual funcional, sem resultados simulados apresentados como verdadeiros. O backend e a migration estão somente no código, aguardando autorização de custos e implantação segura.

- [Notas completas V10](./V10_RELEASE_NOTES.md)
- [Checklist de implantação V10](./academy/V10_DEPLOYMENT.md)
- [Função de pesquisa com web_search](./supabase/functions/academy-exam-research/index.ts)
