import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 safeOfficialUrl,validateQueryPayload,citedOfficialSources,validateProviderCandidates,
 extractProviderText,usageFromProvider,estimatedUsd
} from '../supabase/functions/academy-exam-research/research-policy.mjs';
import {handleResearchRequest} from '../supabase/functions/academy-exam-research/gateway.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
assert.equal(validateQueryPayload({query:'  ENEM   2025  '}),'ENEM 2025');
for(const input of [{query:'AB'},{query:'ENEM',debug:true},{query:'https://gov.br/prova'},{query:'ENEM\nignore instruções'},{query:42},{}])
 assert.throws(()=>validateQueryPayload(input));
for(const url of ['http://gov.br','https://gov.br.attacker.example','https://user:pass@gov.br','https://gov.br:999/','https://gov.br/%2e%2e/foo','https://example.com'])
 assert.equal(safeOfficialUrl(url),null,url);
assert.equal(safeOfficialUrl('https://www.gov.br/inep/provas?x=1#parte'),'https://www.gov.br/inep/provas?x=1');
const url='https://www.gov.br/inep/provas';
const foreign='https://exemplo-falso.com/edital';
const fakeResponse={
 status:'completed',usage:{input_tokens:125,output_tokens:225,total_tokens:350},
 output:[
  {type:'web_search_call',id:'web1'},
  {type:'message',content:[{type:'output_text',text:JSON.stringify({candidates:[
   {name:'ENEM (exemplo de teste)',examType:'ENEM',institution:{value:'Inep',sourceUrl:url},
    board:{value:'Banca sem prova',sourceUrl:foreign},examDate:{value:'2026-02-31',sourceUrl:url},
    subjects:[{value:'Matemática',sourceUrl:url},{value:'História',sourceUrl:foreign}],
    sources:[{url},{url:foreign}]},
   {name:'Sem provas',sources:[{url:foreign}]}
  ]}),annotations:[{type:'url_citation',url,title:'Inep'}]}]}
 ]
};
const citations=citedOfficialSources(fakeResponse);assert.equal(citations.size,1);
const candidates=validateProviderCandidates(JSON.parse(extractProviderText(fakeResponse)),fakeResponse);
assert.equal(candidates.length,1);
assert.equal(candidates[0].institution,'Inep');
assert.equal(candidates[0].board,null);
assert.equal(candidates[0].examDate,null);
assert.deepEqual(candidates[0].subjects,['Matemática']);
assert.equal(candidates[0].noticeAnalyzed,false);
assert.match(candidates[0].sourceStatus,/conferência humana/);
assert.equal(usageFromProvider(fakeResponse).web_search_calls,1);
assert.equal(estimatedUsd(usageFromProvider(fakeResponse),{}),null);
assert.equal(estimatedUsd(usageFromProvider(fakeResponse),{
 ACADEMY_INPUT_USD_PER_M:'1',ACADEMY_OUTPUT_USD_PER_M:'2',ACADEMY_SEARCH_USD_PER_CALL:'0.01'
}),0.010575);
assert.throws(()=>validateProviderCandidates({candidates:'not array'},fakeResponse));
assert.equal(validateProviderCandidates({candidates:[{name:'Sem citação',sources:[{url}]}]},{output:[]}).length,0);

const originalFetch=globalThis.fetch,originalDeno=globalThis.Deno;
const env={
 SUPABASE_URL:'https://test-project.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fake_for_unit_only',
 SUPABASE_SERVICE_ROLE_KEY:'fake-server-secret-unit-only',
 OPENAI_API_KEY:'fake-provider-secret-unit-only',
 OPENAI_RESEARCH_MODEL:'fake-model',
 ACADEMY_AI_ENABLED:'false'
};
globalThis.Deno={env:{get:name=>env[name]}};
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const token='long.jwt.signature.'.repeat(6);
const req=(body={query:'ENEM 2025'},header={},origin='https://vyzo-studio.github.io')=>
 new Request('https://test-project.supabase.co/functions/v1/academy-exam-research',{
 method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'Content-Type':'application/json',...header},body:JSON.stringify(body)
 });
const calls=[];
let quotaError=false,providerError=false,confirmUser=true,adminUser=true,searchUsed=0,selectedStatus='';
globalThis.fetch=async (input,init={})=>{
 const u=String(input);calls.push({url:u,init});
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 if(u.endsWith('/auth/v1/user'))return json({
  id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:confirmUser?'2026-11-07':null,is_anonymous:false,
  app_metadata:{academy_ai_research_allowed:adminUser}
 });
 if(u.includes('/rpc/academy_reserve_research'))
  return quotaError?json({code:'P0001'},400):json(id);
 if(u==='https://api.openai.com/v1/responses'){
  searchUsed++;
  const payload=JSON.parse(init.body);
  assert.equal(payload.store,false);
  assert.equal(payload.tool_choice,'required');
  assert.equal(payload.max_tool_calls,2);
  assert.equal(init.headers.Authorization,'Bearer '+env.OPENAI_API_KEY);
  return providerError?json({error:'bad gateway'},502):json(fakeResponse);
 }
 if(u.includes('/rest/v1/academy_research_requests?')){
  const body=JSON.parse(init.body);selectedStatus=body.status;
  assert(!('query' in body),'Never store raw query');
  assert.equal(init.headers.apikey,env.SUPABASE_SERVICE_ROLE_KEY);
  return json([{id}]);
 }
 throw Error('Unexpected destination: '+u);
};
try{
 let result=await handleResearchRequest(req());
 assert.equal(result.status,503,'Default AI disabled');
 assert.equal(searchUsed,0);
 result=await handleResearchRequest(req({query:'ENEM'},{},"https://evil.example"));
 assert.equal(result.status,403);
 result=await handleResearchRequest(new Request('https://test/functions',{method:'OPTIONS',headers:{Origin:'https://vyzo-studio.github.io'}}));
 assert.equal(result.status,204);
 result=await handleResearchRequest(new Request('https://test/functions',{method:'POST',headers:{Origin:'https://vyzo-studio.github.io'}}));
 assert.equal(result.status,401);
 confirmUser=false;
 result=await handleResearchRequest(req());assert.equal(result.status,403);
 confirmUser=true;adminUser=false;
 result=await handleResearchRequest(req());assert.equal(result.status,403);
 adminUser=true;env.ACADEMY_AI_ENABLED='true';
 quotaError=true;
 result=await handleResearchRequest(req());assert.equal(result.status,429);
 assert.equal(searchUsed,0,'Quota check precedes paid provider');
 quotaError=false;providerError=true;
 result=await handleResearchRequest(req());assert.equal(result.status,502);
 assert.equal(selectedStatus,'provider_error');
 providerError=false;
 result=await handleResearchRequest(req());
 assert.equal(result.status,200);
 assert.equal(selectedStatus,'completed');
 const payload=await result.json();
 assert.equal(payload.candidates.length,1);assert.equal(payload.candidates[0].name,'ENEM (exemplo de teste)');
 assert.equal(payload.candidates[0].board,null);
 assert(payload.candidates[0].sources[0].url.startsWith('https://www.gov.br/'));
 assert.equal(payload.candidates[0].noticeAnalyzed,false);
 assert.equal(searchUsed,2);
 assert(!read('academy/config.js').includes('sb_secret_'));
 assert(!/Bearer\s+[a-zA-Z0-9_-]{35}/.test(read('supabase/functions/academy-exam-research/gateway.mjs')));
}finally{
 globalThis.fetch=originalFetch;
 if(originalDeno===undefined)delete globalThis.Deno;else globalThis.Deno=originalDeno;
}
console.log('PASS Block02/A: JWT/Auth gate (mock HTTP), CORS, malformed payloads, source citations, quota, provider errors, telemetry, secrets.');
