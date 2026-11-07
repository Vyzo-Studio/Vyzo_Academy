# VYZO ACADEMY — Redação B2 | Integração segura do envio

**Data:** 07/11/2026. **Status:** IMPLEMENTADO, AGUARDANDO HOMOLOGAÇÃO. **PR:** [#16](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/16), base do [#13](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/13) (B1), por sua vez dependente do [#12](https://github.com/Vyzo-Studio/Vyzo_Academy/pull/12) (A).

## Implementação efetiva

- `academy/essay-assessment-client.mjs`: verifica `auth.getUser()`, email confirmado, permissões administrativas `academy_ai_essay_allowed` e `academy_adult_verified`, vínculo da redação à conta, proposta ENEM homologada no catálogo e modo treino. Exige ao menos 20 palavras/80 caracteres.
- O endpoint recebe **apenas ID da redação + timestamp da revisão**. O backend B1 (ainda não implantado) busca o texto no banco sob Auth/RLS e verifica o snapshot; nenhuma chave privada é incluída no navegador.
- `academy/app.mjs`: botão integrado ao editor A, salva antes com compare-and-swap, rejeita alteração de conta, tratamento de erros, preserva texto e versões. `academy/essay-lab-ui.mjs`: status acessível e indicador de correção apenas com permissão. Modo simulado continua BLOQUEADO até protocolo de entrega e homologação.
- Não introduz correção fictícia, não gera notas no navegador e não substitui editor existente; relatório detalhado continua pendente da B3.

## Testes e limites

- [GitHub Actions PR #16](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42407701540) **PASS**; [push](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42407697681) **PASS**.
- `tests/essay_b2_client.test.mjs` e `tests/essay_b2_browser.py` usam **Auth e provedor SIMULADOS**. Cenários: usuário inelegível, texto insuficiente, revisão/score inválidos, duplicação, timeout/desativação, falha e retry, idêntica revisão e preservação do texto.
- **Não comprova correção real por IA nem autenticação E2E; não disponibilizado em produção.** A migração B1 não foi aplicada definitivamente. Supabase Academy possui gate fechado e zero contas reais no último levantamento.

## Pendências

1. Homologar PR #8 com duas contas adultas reais em ambiente controlado, confirmação de e-mail, RLS HTTP e idade/privacidade.
2. Revisar e aplicar B1 apenas após aprovações; configurar provedor, cota e despesas previamente autorizadas.
3. Testar um envio REAL ponta a ponta antes de declarar IA operacional.
4. Implementar visualização B3, revalidação do resultado, experiência de recuperação e entrega segura do modo simulado.

**Nenhum recurso pago ou cadastro foi ativado. PR deve permanecer draft sem merge.**
