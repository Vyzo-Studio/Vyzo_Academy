/** V15 Stage 01 — bloqueios obrigatórios na publicação incremental. */
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const unavailable=[
 'academy/v12-auth-core.mjs',
 'academy/v12-entry.html',
 'academy/v12-entry.mjs',
 'academy/v15-school-content.mjs',
 'academy/v15-school-engine.mjs',
 'academy/v15-school-ui.mjs',
 'supabase/proposals/v15_1_curriculum_model.sql'
];
for(const path of unavailable){
 assert.equal(existsSync(new URL(path,root)),false,
  'Recurso em revisão não pode ser incluído no release V15: '+path);
}
// Única exceção revisada: dois links de 2024 identificados no índice oficial do Inep.
 // Não libera provas convertidas, conteúdo de PDFs, conteúdo escolar ou recursos de contas.
const {OFFICIAL_PAPERS}=await import('../academy/v15-official-papers.mjs');
assert.equal(OFFICIAL_PAPERS.length,2,'Somente o lote de cadernos com links conferidos no índice.');
for(const p of OFFICIAL_PAPERS){
 assert.equal(p.year,2024);
 assert.equal(p.verifiedStatus,'vinculado_no_indice_oficial');
 assert.equal(p.contentsReviewed,false);
 assert.equal(p.interactiveReady,false);
 assert(p.officialPage.startsWith('https://www.gov.br/inep/'));
 assert(p.paperUrl.startsWith('https://download.inep.gov.br/enem/'));
 assert(p.keyUrl.startsWith('https://download.inep.gov.br/enem/'));
}

// Migrações SQL podem ser versionadas na main sem habilitar a UI de login.
// O bloqueio de módulos V12 executáveis e pilotos não revisados permanece.
assert.match(read('supabase/migrations/202611050003_vyzo_academy_v12.sql'),/academy_private_records/);
const html=read('academy/v9.html');
const journey=read('academy/v9.mjs');
const core=read('academy/v9-core.mjs');
assert.match(html,/Modo local · sem conta/,'A jornada precisa identificar explicitamente o modo local.');
assert.match(html,/Entenda o armazenamento local/,'Não anunciar cadastro indisponível.');
assert.doesNotMatch(html,/Ver cadastro em nuvem/);
assert.match(journey,/const KEY='vyzo-academy-v9-guest-1'/,'Chave de histórico local V9 deve permanecer igual.');
assert.match(journey,/schema:9/,'Schema de backup local V9 deve ser preservado.');
assert.match(core,/if\(goal.type==='Prova escolar'\|\|goal.educationStage\)return \[\];/,
 'Nenhuma questão ENEM deve aparecer como diagnóstico de série escolar.');
assert.doesNotMatch(journey,/v12-entry|v12-auth-core|v15-school-content|v15-school-ui/,
 'A versão pública não pode carregar serviços V12 ou pilotos não homologados.');
console.log('PASS V16 release gate: sem V12, sem pilotos V15.1; apenas 2 links oficiais 2024 sem PDFs convertidos, V9 local e isolamento ENEM.');
