# VYZO Academy V16 — checkpoint Fase 0 / Módulo 01

**Data:** 07/11/2026. **Escopo:** inventário e classificação, **sem alterar aplicações, banco, Auth, endpoints ou publicação**.

## Fonte da verdade

- `main` = `aa89eb5e3b8b028d197e35da8d7b99bfd6a577aa`.
- GitHub Actions `main`: [Quality checks PASS](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42390932861); [Pages deploy PASS](https://github.com/Vyzo-Studio/Vyzo_Academy/actions/runs/42390932630). URL real não foi navegável pela ferramenta HTTP de auditoria.
- PRs abertos: **#3, #5, #8, #10, #12, #13**, todos `draft`; #5 depende de #3 e #13 depende de #12.
- Projeto Supabase **exclusivo** `Vyzo_academy`: `cfrlqinzsysoqcduqftd`, ACTIVE_HEALTHY; **20 tabelas / 20 RLS / 62 políticas / 8 migrações**.
- **Sem usuários** (`auth.users=0`), sem redações, objetivos, perfis ou pesquisas persistidas nos dados consultados; inscrições **fechadas**.
- `academy-exam-research` Edge Function implantada com `verify_jwt=true`, sem operação paga comprovada; `academy-essay-assess` **não** implantada.
- `academy/config.js` na main com URL e publishableKey vazias; contas não funcionam na página pública.
- Security Advisor: reservas fechadas sem políticas (3 informativos) e 1 alerta `SECURITY DEFINER` para `academy_reserve_research`. [Revisão recomendada](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Backups: branches e arquivos SQL, **sem evidência de dump/restore atual dos dados**.

## Matriz resumida

| Estado | Módulos |
|---|---|
| CONCLUÍDO E VALIDADO | 01 |
| IMPLEMENTADO, AGUARDANDO HOMOLOGAÇÃO | 03, 05, 20 |
| PARCIALMENTE IMPLEMENTADO | 02, 07, 09, 10, 11, 14, 16, 18, 19, 22, 25, 26, 27, 30, 31, 32, 33, 35 |
| NÃO IMPLEMENTADO | 13, 15, 17, 23, 24, 28, 34 |
| BLOQUEADO POR INFRAESTRUTURA | 12, 21 |
| BLOQUEADO POR SEGURANÇA OU PRIVACIDADE | 04, 06, 29, 36 |
| BLOQUEADO POR CONTEÚDO EDUCACIONAL | 08 |

**Detalhamento/evidências:** [VYZO_ACADEMY_MASTER_ROADMAP.md](./VYZO_ACADEMY_MASTER_ROADMAP.md)

## Riscos e prioridades imediatas

1. PRs #3/#5/#8/#10 divergem da main; mudanças em `academy/app.mjs`, `academy/v9.mjs`, workflow e testes exigem plano de merge. Proibido integração em massa.
2. Preservar simulador clássico, V9 guest e V8 cloud com políticas explícitas de importação e backups antes de conciliar dados.
3. Auth em draft, zero contas, gate fechado; não abrir inscrições nem afirmar suporte escolar para menores.
4. IA real por provedor, leitura de editais, correção ENEM E2E e monitoramento contínuo ainda não comprovados.
5. Sem backup operacional testado nem validação interativa do domínio público.

**Próxima unidade recomendada:** Fase 0 / **Módulo 02**, por subetapas: mapear/reconciliar conflitos, priorizar Auth com gates, aplicar QA específico, **sem publicação antes de homologação**.

**Regra:** parar aqui. Nenhuma implementação dos módulos 02–36 autorizada por este checkpoint.
