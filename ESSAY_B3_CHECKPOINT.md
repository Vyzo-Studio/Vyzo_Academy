# VYZO ACADEMY — Redação B3 / Visualização da correção

**Data:** 07/11/2026. **Status:** código implementado em branch de homologação; não operacional no site público. **Dependências:** PRs #8, #12, #13, #16.

## Implementado no código

- `academy/essay-assessment-report.mjs`: consulta somente avaliação vinculada à conta e redação, via Supabase (owner/essay/status), exige `completed`, proposta ENEM correta e relatório que passa na validação B2. Rejeita citações de trechos inexistentes no snapshot da redação submetida.
- Renderização DOM via `textContent`, sem HTML do provedor, com título "NOTA ESTIMADA", C1–C5, justificativas, pontos positivos e negativos, trechos com sugestões, análise de argumentos/coesão/repertório/intervenção e prioridades. "Revisão humana" não inventa nota.
- `academy/app.mjs`: confirmação de persistência na tabela `academy_essay_assessments` antes de abrir página; retorno ao editor e recuperação da última avaliação sob RLS. Nunca modifica a redação ou as versões por causa do resultado.
- Editor A e API B1 preservados; UI em português brasileiro responsivo.

## Validação e limites

- `tests/essay_b3_report.test.mjs`: validação de proprietário, IDs, rubrica, trecho literal, soma e leitura do histórico com Supabase simulado.
- `tests/essay_b2_browser.py` expandido: simula falha/retentativa, gravação de resultado mock, visualização, volta ao editor e abertura do histórico; não acessa IA real.
- Não afirma que a função B1 está implantada. A migration B1 não foi aplicada permanentemente. Contas/IA/segredos permanecem bloqueados até aprovação.

**Bloqueios:** testes HTTP com duas contas reais, legislação de menores, orçamento/API autorizado, finalização simulado, avaliação E2E de provedor real, auditoria de retenção e acesso. Sem ativar flags, cadastrar estudantes ou gastar recursos pagos.
