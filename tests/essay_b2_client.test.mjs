import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ASSESS_FUNCTION,eligibleEssay,assessmentRequest,
 submitSavedEssay,validateAssessmentEnvelope} from '../academy/essay-assessment-client.mjs';
const OWNER='2caed453-479e-40a8-a884-1a2800000001';
const ID='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const EVALUATION='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const REV='2026-11-07T19:00:00.000Z';
const user={id:OWNER,email_confirmed_at:'2026-11-07T12:00:00Z',is_anonymous:false,
 app_metadata:{academy_ai_essay_allowed:true,academy_adult_verified:true}};
const essay={id:ID,user_id:OWNER,proposal_id:'enem-inclusao-digital-2026-a1',proposal_version:1,
 writing_mode:'treino',updated_at:REV,
 body:'A desigualdade de acesso à internet dificulta a cidadania no Brasil. Muitas comunidades enfrentam obstáculos de infraestrutura e de renda que impedem a participação digital. Por isso, políticas públicas de conectividade e formação tecnológica são necessárias para reduzir a exclusão.'};
const rationale='O texto demonstra elementos de argumentação e atende ao tema proposto.';
const report={official:false,estimated:true,rubric_id:'enem-cartilha-2026',
 status:'scored',total_score:800,
 competences:['C1','C2','C3','C4','C5'].map(id=>({id,score:160,rationale})),
 issues:[{quote:'A desigualdade de acesso à internet'}]};
const envelope={assessment_id:EVALUATION,status:'completed',result:report};
assert.equal(ASSESS_FUNCTION,'academy-essay-assess');
assert(eligibleEssay(user,essay));
assert.equal(eligibleEssay({...user,app_metadata:{}},essay),false);
assert.equal(eligibleEssay({...user,app_metadata:{academy_ai_essay_allowed:true}},essay),false);
assert.equal(eligibleEssay({...user,email_confirmed_at:null},essay),false);
assert.equal(eligibleEssay({...user,is_anonymous:true},essay),false);
assert.equal(eligibleEssay(user,{...essay,user_id:'other'}),false);
assert.equal(eligibleEssay(user,{...essay,writing_mode:'simulado'}),false);
assert.equal(eligibleEssay(user,{...essay,proposal_id:'unknown'}),false);
assert.equal(eligibleEssay(user,{...essay,id:'not-uuid'}),false);
assert.deepEqual(assessmentRequest(user,essay),{essay_id:ID,revision:REV});
for(const bad of [{...essay,body:'texto curto'}, {...essay,updated_at:'bad'},
 {...essay,proposal_version:3},{...essay,body:' '.repeat(50002)}])
 assert.throws(()=>assessmentRequest(user,bad));
assert.deepEqual(validateAssessmentEnvelope(envelope),envelope);
assert.throws(()=>validateAssessmentEnvelope({...envelope,result:{...report,total_score:1000}}));
assert.throws(()=>validateAssessmentEnvelope({...envelope,result:{...report,official:true}}));
assert.throws(()=>validateAssessmentEnvelope({...envelope,result:{...report,competences:[]}}));
assert.throws(()=>validateAssessmentEnvelope({...envelope,result:{...report,status:'manual_review'}}));

let invokes=0,reads=0,mode='success',release;
const gate=()=>new Promise(resolve=>release=resolve);
let blocker=null;
const client={
 auth:{getUser:async()=>{reads++;return {data:{user},error:null};}},
 functions:{invoke:async(name,payload)=>{
  invokes++;
  assert.equal(name,'academy-essay-assess');
  assert.deepEqual(payload.body,{essay_id:ID,revision:REV});
  assert(!('body' in payload.body),'Texto deve ser obtido no backend, nunca do payload da API');
  if(blocker)await blocker;
  if(mode==='failure')return {data:null,error:{context:{status:503}}};
  if(mode==='invalid')return {data:{...envelope,result:{...report,total_score:900}},error:null};
  return {data:envelope,error:null};
 }}
};
blocker=gate();
const first=submitSavedEssay({client,user,essay});
const duplicate=submitSavedEssay({client,user,essay});
await Promise.resolve();release();
const [a,b]=await Promise.all([first,duplicate]);
assert.equal(a.assessment_id,EVALUATION);
assert.equal(b.assessment_id,EVALUATION);
assert.equal(invokes,1,'Deduplicação local por revisão evita chamadas paralelas');
assert.equal(reads,1,'A mesma solicitação não exige revalidar sessão duas vezes');
assert.equal(essay.updated_at,REV);
assert.equal(essay.body.includes('A desigualdade'),true);
blocker=null;
mode='failure';await assert.rejects(submitSavedEssay({client,user,essay}),/Correção com IA ainda não habilitada/);
mode='invalid';await assert.rejects(submitSavedEssay({client,user,essay}),/soma das competências/);
mode='success';assert.equal((await submitSavedEssay({client,user,essay})).status,'completed');
assert.equal(invokes,4,'Após erro é permitido tentar novamente sem perder a versão original.');
const otherClient={auth:{getUser:async()=>({data:{user:{...user,id:'someone-else'}}})},functions:{invoke:async()=>{throw Error('unexpected')}};
};
await assert.rejects(submitSavedEssay({client:otherClient,user,essay}),/sessão/);
const app=readFileSync(new URL('../academy/app.mjs',import.meta.url),'utf8');
const ui=readFileSync(new URL('../academy/essay-lab-ui.mjs',import.meta.url),'utf8');
assert(app.includes("case 'essay-assess':"));
assert(app.includes('await saveEssayDraft();'));
assert(app.includes('submitSavedEssay({client:data.client,user:data.user,essay:current})'));
assert(ui.includes("CORRIGIR MINHA REDAÇÃO"));
assert(ui.includes("if(canAssess)"));
assert(!ui.includes('OPENAI_API_KEY'));
console.log('PASS B2: authenticated submit, permission gate, 20-word validation, idempotent request, invalid score, provider downtime, retry and editor persistence.');
