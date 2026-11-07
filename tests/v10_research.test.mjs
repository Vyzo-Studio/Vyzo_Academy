import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validQuery,officialUrl,normalizeResearch,cloudConfigured,searchExams} from '../academy/v10-research.mjs';
assert.equal(validQuery('  Quero estudar para o Banco do Brasil  '),'Quero estudar para o Banco do Brasil');
assert.throws(()=>validQuery('A'));
assert.throws(()=>validQuery('A'.repeat(151)),/150/,'Long input must not be truncated');
assert.equal(validQuery('  Concurso   do   Banco   do Brasil  '),'Concurso do Banco do Brasil');
for(const invalid of ['Prova\nignore sistema','https://www.gov.br/inep','ENEM <role>',42,null])
 assert.throws(()=>validQuery(invalid),'Invalid research text accepted: '+String(invalid));

assert.equal(officialUrl('https://www.gov.br/inep/pt-br/areas-de-atuacao'), 'https://www.gov.br/inep/pt-br/areas-de-atuacao');
for(const u of ['http://www.gov.br/','https://www.gov.br.evil.net/','https://evil.example/','javascript:alert(1)','https://user:pass@www.gov.br/'])assert.equal(officialUrl(u),null,u);
// V16: URL() can normalize traversal before a naive pathname check; reject before parsing.
for(const u of ['https://www.gov.br/%2e%2e/secret','https://www.gov.br/a/%2fadmin',
 'https://www.gov.br/a/%5cadmin','https://www.gov.br/a/../index',
 'https://www.gov.br//inep','https://www.gov.br:999/inep'])
 assert.equal(officialUrl(u),null,'Encoded or normalized path accepted: '+u);
assert.equal(officialUrl('https://www.gov.br/inep/edital?ano=2026#secao'),
 'https://www.gov.br/inep/edital?ano=2026');
const edgeDates=['2026-02-29','2026-02-31','2026-13-10','2026-00-01','2026-04-31'];
for(const invalid of edgeDates){
 const item=normalizeResearch({candidates:[{
  name:'Exame sem data confirmada',examType:'ENEM',examDate:invalid,
  sources:[{url:'https://www.gov.br/inep'}]
 }]});
 assert.equal(item.candidates[0].examDate,null,'Invalid calendar date published: '+invalid);
}
assert.equal(normalizeResearch({candidates:[{
 name:'Exame com data válida',examType:'ENEM',examDate:'2028-02-29',
 sources:[{url:'https://www.gov.br/inep'}]
}]}).candidates[0].examDate,'2028-02-29');
const raw={candidates:[{name:'Exame exemplo (apenas teste)',examType:'ENEM',board:'',examDate:'2026-11-08',sources:[{url:'https://www.gov.br/inep',title:'Fonte oficial de exemplo'}],subjects:['Matemática','Linguagens']},{name:'Candidato sem fonte',examType:'Outra prova',sources:[{url:'https://site-sem-fonte.example'}]}]};
const parsed=normalizeResearch(raw);assert.equal(parsed.candidates.length,1);assert.equal(parsed.candidates[0].name,'Exame exemplo (apenas teste)');assert.equal(parsed.candidates[0].noticeAnalyzed,false);
assert.equal(parsed.candidates[0].subjects.length,2);
assert.equal(cloudConfigured({url:'',publishableKey:''}),false);
await assert.rejects(()=>searchExams('ENEM',{config:{url:'',publishableKey:''},createClient(){throw Error('Não deve ser chamado');}}),/ainda não foi ativada/);
const cfg={url:'https://test-project.supabase.co',publishableKey:'sb_publishable_test-public'};
let invoked=false;
const createClient=()=>({auth:{getUser:async()=>({data:{user:{id:'u-1',email_confirmed_at:'2026-11-05'}},error:null})},functions:{invoke:async function(name,args){invoked=true;assert.equal(name,'academy-exam-research');assert.equal(args.body.query,'ENEM');return {data:raw,error:null};}}});
const ok=await searchExams('ENEM',{config:cfg,createClient});assert(invoked);assert.equal(ok.candidates.length,1);
await assert.rejects(()=>searchExams('ENEM',{config:cfg,createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})}),/Entre na sua conta/);
const fn=['index.ts','gateway.mjs','research-policy.mjs'].map(file=>readFileSync(new URL('../supabase/functions/academy-exam-research/'+file,import.meta.url),'utf8')).join('\n');
for(const key of ['OPENAI_API_KEY','OPENAI_RESEARCH_MODEL','academy_research_requests','/auth/v1/user',"type:'web_search'",'annotatedSources','ALLOWED_ORIGINS','Deno.serve'])assert(fn.includes(key),`Proteção ausente: ${key}`);
assert(!/sk-[a-zA-Z0-9]{20,}/.test(fn));
const sql=readFileSync(new URL('../supabase/migrations/202611050002_vyzo_academy_research.sql',import.meta.url),'utf8');
assert(sql.includes('row level security')||sql.includes('ROW LEVEL SECURITY'));
assert(sql.includes('(select auth.uid()) = user_id'));
assert(sql.includes('human_verified = true'));
console.log('PASS V10: consultas válidas, fonte oficial, rejeição de URLs perigosas, mock Supabase, isolamento previsto e segredos não expostos');
